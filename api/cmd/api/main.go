package main

import (
	"log"
	"net/http"
	"os"

	"github.com/99designs/gqlgen/graphql/handler"
	"github.com/99designs/gqlgen/graphql/handler/extension"
	"github.com/99designs/gqlgen/graphql/handler/transport"
	"github.com/99designs/gqlgen/graphql/playground"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"api/database"
	"api/graph"
	"api/graph/generated"
	websocket "api/libs"
	"api/services/auth"
	"api/services/bookings"
	"api/services/categories"
	"api/services/employees"
	"api/services/orders"

	//"api/services/payments"
	"api/services/products"
	"api/services/restaurants"
	"api/services/reviews"
	"api/services/tables"
)

// --- Puerto por Defecto ---
const defaultPort = "8080"

func main() {
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

	// cmd/api/main.go
	rdb := database.NewRedisClient()

	hub := websocket.NewHub()

	// --- Inicializar Servicios (Clean Architecture) ---
	authService := auth.NewService(dbPool)
	//paymentService := payments.NewService(dbPool, stripeKey)
	restaurantService := restaurants.NewService(dbPool, rdb)
	employeeService := employees.NewService(dbPool)
	categoryService := categories.NewService(dbPool, rdb)
	productService := products.NewService(dbPool, rdb)
	tableService := tables.NewService(dbPool)
	reviewService := reviews.NewService(dbPool, rdb)
	bookingService := bookings.NewService(dbPool, rdb)
	orderService := orders.NewService(dbPool, hub)

	// --- Inicializar Servidor GraphQL (Inyectando el servicio) ---
	srv := handler.NewDefaultServer(generated.NewExecutableSchema(generated.Config{
		Resolvers: &graph.Resolver{
			AuthService: authService,
			//PaymentService:    paymentService,
			RestaurantService: restaurantService,
			EmployeeService:   employeeService,
			CategoryService:   categoryService,
			ProductService:    productService,
			ReviewService:     reviewService,
			TableService:      tableService,
			OrderService:      orderService,
			BookingService:    bookingService,
		},
	}))

	// --- Crear rutas con Gin ---
	router := gin.Default()

	// --- Configurar CORS ---
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:4321"},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	srv.AddTransport(transport.Options{})
	srv.AddTransport(transport.GET{})
	srv.AddTransport(transport.POST{})
	srv.Use(extension.Introspection{})

	// --- Rutas ---
	router.POST("/query", func(c *gin.Context) {
		srv.ServeHTTP(c.Writer, c.Request)
	})

	// WebSocket en tiempo real para cocina (registrado en Gin, no en DefaultServeMux)
	router.GET("/ws/orders", func(c *gin.Context) {
		hub.HandleConnection(c.Writer, c.Request)
	})

	router.GET("/playground", func(c *gin.Context) {
		playground.Handler("GraphQL playground", "/query").ServeHTTP(c.Writer, c.Request)
	})

	router.StaticFS("/docs", http.Dir("./docs-tools/public"))

	router.NoRoute(func(c *gin.Context) {
		c.File("./static/404.html")
	})

	// --- Arrancar servidor ---
	log.Printf("🚀 Servidor corriendo en http://localhost:%s/ 🚀", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Error al iniciar servidor:", err)
	}
}
