package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	//"github.com/joho/godotenv"

	"api/database"
	"api/graph"
	"api/graph/dataloaders"
	"api/graph/generated"
	"api/graph/model"
	websocket "api/libs"
	"api/middleware"
	"api/services/auth"
	"api/services/bookings"
	"api/services/carts"
	"api/services/categories"
	cloudinary "api/services/cloudinary"
	"api/services/employees"
	"api/services/messaging"
	"api/services/oauth"
	"api/services/orders"
	"api/services/payments"
	"api/services/products"
	"api/services/restaurants"
	"api/services/reviews"
	"api/services/subscriptions"
	"api/services/tables"
	"api/services/terms"
)

func init() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)
}

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
		slog.Error("error fatal en base de datos", "error", err)
		os.Exit(1)
	}

	defer dbPool.Close()

	// Read replica pool (opcional)
	dbReadPool := database.NewPostgresReadConnection()
	if dbReadPool != nil {
		defer dbReadPool.Close()
	}

	// cmd/api/main.go
	rdb := database.NewRedisClient()

	hub := websocket.NewHubWithRedis(rdb)

	// RabbitMQ producer (opcional)
	var orderProducer *messaging.Producer
	amqpURL := os.Getenv("AMQP_URL")
	if amqpURL != "" {
		var err error
		orderProducer, err = messaging.NewProducer(amqpURL)
		if err != nil {
			slog.Warn("rabbitmq no disponible, continuando sin cola de mensajes", "error", err)
		} else {
			defer orderProducer.Close()
		}
	}

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
		slog.Error("STRIPE_SECRET_KEY no configurada")
		os.Exit(1)
	}
	paymentService := payments.NewService(dbPool, stripeKey)

	restaurantService := restaurants.NewService(dbPool, rdb)
	if dbReadPool != nil {
		restaurantService.DBRead = dbReadPool
	}
	employeeService := employees.NewService(dbPool)
	categoryService := categories.NewService(dbPool, rdb)
	if dbReadPool != nil {
		categoryService.DBRead = dbReadPool
	}
	productService := products.NewService(dbPool, rdb)
	if dbReadPool != nil {
		productService.DBRead = dbReadPool
	}
	tableService := tables.NewService(dbPool)
	reviewService := reviews.NewService(dbPool, rdb)
	if dbReadPool != nil {
		reviewService.DBRead = dbReadPool
	}
	bookingService := bookings.NewService(dbPool, rdb)
	if dbReadPool != nil {
		bookingService.DBRead = dbReadPool
	}
	orderService := orders.NewService(dbPool, hub)
	if dbReadPool != nil {
		orderService.DBRead = dbReadPool
	}
	if orderProducer != nil {
		orderService.Producer = orderProducer
	}

	// Nuevos servicios
	subscriptionService := subscriptions.NewService(dbPool)
	cartService := carts.NewService(dbPool)
	termsService := terms.NewService(dbPool)
	restaurantPaymentService := payments.NewRestaurantPaymentService(dbPool)

	cloudinaryURL := os.Getenv("CLOUDINARY_URL")
	cloudinaryService, err := cloudinary.NewService(cloudinaryURL)

	// Data loaders
	userLoader := dataloaders.NewUserLoader(dbPool)

	// Rate limiter
	rateLimiter := middleware.NewRateLimiter(rdb, dbPool)

	// --- Inicializar Servidor GraphQL (Inyectando el servicio) ---
	gqlSrv := handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{
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
			SubscriptionService:      subscriptionService,
			UserLoader:               userLoader,
		},
	}))

	// --- Crear rutas con Gin --
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(gin.Logger())

	// --- Security Headers ---
	router.Use(middleware.SecurityHeaders())

	// --- Configurar CORS ---
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendURL},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	gqlSrv.AddTransport(transport.Options{})
	gqlSrv.AddTransport(transport.GET{})
	gqlSrv.AddTransport(transport.POST{})
	gqlSrv.Use(extension.Introspection{})

	// --- Rutas ---
	router.GET("/health", func(c *gin.Context) {
		health := gin.H{
			"status":  "ok",
			"version": "2.0.0",
		}

		// DB check
		if err := dbPool.Ping(c.Request.Context()); err != nil {
			health["database"] = gin.H{"status": "error", "error": err.Error()}
			health["status"] = "degraded"
		} else {
			health["database"] = gin.H{"status": "ok"}
		}

		// Redis check
		if err := rdb.Ping(c.Request.Context()).Err(); err != nil {
			health["redis"] = gin.H{"status": "error", "error": err.Error()}
			health["status"] = "degraded"
		} else {
			health["redis"] = gin.H{"status": "ok"}
		}

		// Read replica check
		if dbReadPool != nil {
			if err := dbReadPool.Ping(c.Request.Context()); err != nil {
				health["read_replica"] = gin.H{"status": "error", "error": err.Error()}
			} else {
				health["read_replica"] = gin.H{"status": "ok"}
			}
		} else {
			health["read_replica"] = gin.H{"status": "not_configured"}
		}

		statusCode := http.StatusOK
		if health["status"] != "ok" {
			statusCode = http.StatusServiceUnavailable
		}
		c.JSON(statusCode, health)
	})
	router.POST("/query", rateLimiter.GinMiddleware(), func(c *gin.Context) {
		gqlSrv.ServeHTTP(c.Writer, c.Request)
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

	// --- Arrancar servidor con Graceful Shutdown ---
	httpSrv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		slog.Info("servidor iniciado", "port", port)
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("error al iniciar servidor", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("apagando servidor...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		slog.Error("error durante graceful shutdown", "error", err)
	}

	dbPool.Close()
	if dbReadPool != nil {
		dbReadPool.Close()
	}
	rdb.Close()
	if orderProducer != nil {
		orderProducer.Close()
	}

	slog.Info("servidor apagado correctamente")
}
