package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	//"github.com/joho/godotenv"

	"api/database"
	"api/graph"
	"api/graph/generated"
	"api/graph/model"
	websocket "api/libs"
	"api/services/auth"
	"api/services/bookings"
	"api/services/carts"
	"api/services/categories"
	cloudinary "api/services/cloudinary"
	"api/services/employees"
	"api/services/oauth"
	"api/services/orders"
	"api/services/payments"
	"api/services/products"
	"api/services/restaurants"
	"api/services/reviews"
	"api/services/tables"
	"api/services/terms"
)

// --- Puerto por Defecto ---
const defaultPort = "8080"

func buildOAuthRedirectURL(authResponse *model.AuthResponse) string {
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://suavus.app"
	}
	baseURL := frontendURL + "/auth/callback"
	params := url.Values{}
	params.Add("access_token", authResponse.AccessToken)
	params.Add("user_id", authResponse.User.ID)
	if authResponse.User.Name != nil {
		params.Add("user_name", *authResponse.User.Name)
	}
	if authResponse.User.Email != nil {
		params.Add("user_email", *authResponse.User.Email)
	}
	if authResponse.User.Role != nil {
		params.Add("user_role", *authResponse.User.Role)
	}
	if authResponse.Restaurant != nil {
		params.Add("restaurant", fmt.Sprintf("%d", *authResponse.Restaurant))
	}
	return baseURL + "?" + params.Encode()
}

func main() {
	//err := godotenv.Load()
	//if err != nil {
	//	log.Fatal("Error cargando el archivo .env")
	//}

	// --- Configuracion del Puerto ---
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	// --- Configuracion y Inicializacion de la Base de Datos ---
	dbPool, err := database.NewPostgresConnection()
	if err != nil {
		log.Fatalf("Error fatal en base de datos: %v", err)
	}
	defer dbPool.Close()

	if err := database.RunMigrations(context.Background(), dbPool); err != nil {
		log.Fatalf("Error aplicando migraciones: %v", err)
	}

	// cmd/api/main.go
	rdb := database.NewRedisClient()

	hub := websocket.NewHub()

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "https://suavus.app"
	}

	frontendURL = strings.TrimSpace(frontendURL)
	frontendURL = strings.ReplaceAll(frontendURL, "\r", "")

	// --- Inicializar Servicios (Clean Architecture) ---
	authService := auth.NewService(dbPool)
	oauthService := oauth.NewService(dbPool)

	// Obtener la clave de Stripe de variables de entorno
	stripeKey := os.Getenv("STRIPE_SECRET_KEY")
	if stripeKey == "" {
		log.Fatalf("STRIPE_SECRET_KEY no está configurada en variables de entorno")
	}
	paymentService := payments.NewService(dbPool, stripeKey)

	restaurantService := restaurants.NewService(dbPool, rdb)
	employeeService := employees.NewService(dbPool)
	categoryService := categories.NewService(dbPool, rdb)
	productService := products.NewService(dbPool, rdb)
	tableService := tables.NewService(dbPool)
	reviewService := reviews.NewService(dbPool, rdb)
	bookingService := bookings.NewService(dbPool, rdb)
	orderService := orders.NewService(dbPool, hub)

	// Nuevos servicios
	cartService := carts.NewService(dbPool)
	termsService := terms.NewService(dbPool)
	restaurantPaymentService := payments.NewRestaurantPaymentService(dbPool)

	cloudinaryURL := os.Getenv("CLOUDINARY_URL")
	cloudinaryService, err := cloudinary.NewService(cloudinaryURL)

	// Rate limiter
	//rateLimiter := middleware.NewRateLimiter(rdb, dbPool)

	// --- Inicializar Servidor GraphQL (Inyectando el servicio) ---
	srv := handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{
		Resolvers: &graph.Resolver{
			AuthService:              authService,
			PaymentService:           paymentService,
			RestaurantService:        restaurantService,
			EmployeeService:          employeeService,
			CategoryService:          categoryService,
			ProductService:           productService,
			ReviewService:            reviewService,
			TableService:             tableService,
			OrderService:             orderService,
			BookingService:           bookingService,
			CartService:              cartService,
			TermsService:             termsService,
			CloudinaryService:        cloudinaryService,
			RestaurantPaymentService: restaurantPaymentService,
		},
	}))

	// --- Crear rutas con Gin --
	router := gin.Default()

	// --- Configurar CORS ---
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.Use(extension.Introspection{})

	// --- Rutas ---
	router.POST("/query", func(c *gin.Context) { // rateLimiter.GinMiddleware()
		srv.ServeHTTP(c.Writer, c.Request)
	})

	// REST endpoint for kitchen orders with details
	router.GET("/api/kitchen/orders", func(c *gin.Context) {
		restaurantId := c.Query("restaurantId")
		if restaurantId == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "restaurantId is required"})
			return
		}
		orders, err := orderService.FindOpenOrdersWithDetails(c.Request.Context(), restaurantId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, orders)
	})

	// WebSocket en tiempo real para cocina (registrado en Gin, no en DefaultServeMux)
	router.GET("/ws/orders", func(c *gin.Context) {
		hub.HandleConnection(c.Writer, c.Request)
	})

	router.GET("/playground", func(c *gin.Context) {
		playground.Handler("GraphQL playground", "/query").ServeHTTP(c.Writer, c.Request)
	})

	// --- OAuth2 Routes ---
	// Google OAuth
	router.GET("/auth/google", func(c *gin.Context) {
		authURL, state := oauthService.GetGoogleAuthURL()
		// Guardar estado en cookie para validación posterior
		c.SetCookie("oauth_state", state, 600, "/", "", false, true)
		c.Redirect(http.StatusFound, authURL)
	})

	router.GET("/auth/google/callback", func(c *gin.Context) {
		state := c.Query("state")
		code := c.Query("code")

		if !oauthService.ValidateOAuthState(state) {
			c.Redirect(http.StatusFound, frontendURL+"/auth/callback?error=invalid_state")
			return
		}

		authResponse, err := oauthService.HandleGoogleCallback(c.Request.Context(), code)
		if err != nil {
			c.Redirect(http.StatusFound, frontendURL+"/auth/callback?error="+url.QueryEscape(err.Error()))
			return
		}

		c.Redirect(http.StatusFound, buildOAuthRedirectURL(authResponse))
	})

	/*
		// Facebook OAuth
		router.GET("/auth/facebook", func(c *gin.Context) {
			authURL, state := oauthService.GetFacebookAuthURL()
			c.SetCookie("oauth_state", state, 600, "/", "", false, true)
			c.Redirect(http.StatusFound, authURL)
		})

		// Facebook OAuth Callback
		router.GET("/auth/facebook/callback", func(c *gin.Context) {
			state := c.Query("state")
			code := c.Query("code")

			if !oauthService.ValidateOAuthState(state) {
				c.Redirect(http.StatusFound, frontendURL+"/auth/callback?error=invalid_state")
				return
			}

			authResponse, err := oauthService.HandleFacebookCallback(c.Request.Context(), code)
			if err != nil {
				c.Redirect(http.StatusFound, frontendURL+"/auth/callback?error="+url.QueryEscape(err.Error()))
				return
			}

			c.Redirect(http.StatusFound, buildOAuthRedirectURL(authResponse))
		})

		// Twitter (X) OAuth
		router.GET("/auth/twitter", func(c *gin.Context) {
			authURL, state := oauthService.GetTwitterAuthURL()
			c.SetCookie("oauth_state", state, 600, "/", "", false, true)
			c.Redirect(http.StatusFound, authURL)
		})

		// Twitter (X) OAuth Callback
		router.GET("/auth/twitter/callback", func(c *gin.Context) {
			state := c.Query("state")
			code := c.Query("code")

			if !oauthService.ValidateOAuthState(state) {
				c.Redirect(http.StatusFound, frontendURL+"/auth/callback?error=invalid_state")
				return
			}

			authResponse, err := oauthService.HandleTwitterCallback(c.Request.Context(), code)
			if err != nil {
				c.Redirect(http.StatusFound, frontendURL+"/auth/callback?error="+url.QueryEscape(err.Error()))
				return
			}

			c.Redirect(http.StatusFound, buildOAuthRedirectURL(authResponse))
		})
	*/

	router.NoRoute(func(c *gin.Context) {
		c.Redirect(http.StatusFound, "https://suavus.app")
	})

	// --- Arrancar servidor ---
	log.Printf("🚀 Servidor corriendo en http://localhost:%s/ 🚀", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Error al iniciar servidor:", err)
	}
}
