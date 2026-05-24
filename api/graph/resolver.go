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
	mu                sync.Mutex
	OrderObservers    map[int][]chan *model.Order
}
