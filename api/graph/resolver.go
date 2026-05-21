package graph

import (
	"api/graph/model"
	"api/services/auth"
	"api/services/bookings"
	"api/services/categories"
	"api/services/employees"
	"api/services/orders"
	"api/services/payments"
	"api/services/products"
	"api/services/restaurants"
	"api/services/reviews"
	"api/services/tables"
	"sync"
)

// This file will not be regenerated automatically.
//
// It serves as dependency injection for your app, add any dependencies you require here.

type Resolver struct {
	BookingService    *bookings.Service
	RestaurantService *restaurants.Service
	PaymentService    *payments.Service
	AuthService       *auth.Service
	ProductService    *products.Service
	CategoryService   *categories.Service
	ReviewService     *reviews.Service
	TableService      *tables.Service
	EmployeeService   *employees.Service
	OrderService      *orders.Service
	// --- LÓGICA DE WEBSOCKETS ---
	mu sync.Mutex
	// Mapa: ID del Restaurante -> Lista de canales de cocineros escuchando
	OrderObservers map[int][]chan *model.Order
}

func NewResolver(orderSvc *orders.Service) *Resolver {
	return &Resolver{
		OrderService:   orderSvc,
		OrderObservers: make(map[int][]chan *model.Order),
	}
}
