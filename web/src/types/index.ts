// ==================== USUARIOS ====================
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: "user" | "staff" | "admin" | "superadmin";
  restaurantId?: string;
  createdAt: Date;
}

// ==================== RESTAURANTES ====================
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image: string;
  address: string;
  phone: string;
  email: string;
  rating: number;
  hours: string;
  createdAt: Date;
}

export interface RestaurantData {
  restaurants: Restaurant[];
}

export interface RestaurantByIdData {
  restaurant: Restaurant;
}

// ==================== CATEGORIAS ====================
export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  restaurantId: string;
  productCount: number;
  createdAt: Date;
}

export interface CategoryData {
  categories: Category[];
}

export interface CategoryByIdData {
  category: Category;
}

// ==================== PRODUCTOS ====================
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string;
  category: Category;
  restaurantId: string;
  restaurant: Restaurant;
  isAvailable: boolean;
  ingredients?: string[];
  createdAt: Date;
}

export interface ProductData {
  products: Product[];
}

// ==================== ORDENES ====================
export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  restaurant?: Restaurant;
  items: OrderItem[];
  status:
    | "pending"
    | "preparing"
    | "ready"
    | "delivered"
    | "cancelled"
    | "completed"
    | "open";
  paymentStatus: "pending" | "paid" | "refunded";
  paymentMethod?: "cash" | "card";
  tableId?: string;
  total: number;
  paid: boolean;
  type: "dine_in" | "takeaway" | "delivery" | "app";
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrdersData {
  ordersByRestaurant: Order[];
}

export interface OrderByIdData {
  order: Order;
}

export interface CreateOrderData {
  createOrder: Order;
}

export interface UserOrdersData {
  ordersByUser: Order[];
}

export interface UpdateOrderPaymentData {
  updateOrderPayment: Order;
}

// ==================== RESERVAS ====================
export interface Reservation {
  id: string;
  userId: string;
  user?: User;
  restaurantId: string;
  restaurant?: Restaurant;
  tableId?: string;
  date: Date;
  time: string;
  guests: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes?: string;
  createdAt: Date;
}

// ==================== RESENAS ====================
export interface Review {
  id: string;
  userId: string;
  user?: User;
  restaurantId: string;
  rating: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewsData {
  reviews: Review[];
}

// ==================== MESAS ====================
export interface Table {
  id: string;
  restaurantId: string;
  number: number;
  capacity: number;
  status: "available" | "occupied" | "reserved";
  currentOrderId?: string;
}

export interface TableData {
  tables: Table[];
}

// ==================== EMPLEADOS ====================
export interface Employee {
  id: string;
  userId: string;
  user?: User;
  restaurantId: string;
  position: string;
  hireDate: Date;
  isActive: boolean;
}

export interface EmployeeData {
  employeesByRestaurant: Employee[];
}

// ==================== TICKETS ====================
export interface Ticket {
  id: string;
  orderId: string;
  order: Order;
  userId: string;
  restaurantName: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: "cash" | "card";
  cashReceived?: number;
  change?: number;
  createdAt: Date;
}

// ==================== PAGO ====================
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: "cash" | "card";
  status: "pending" | "completed" | "failed";
  cashReceived?: number;
  change?: number;
  cardLast4?: string;
  createdAt: Date;
}

export interface PaymentData {
  payments: Payment[];
}

export interface PaymentByIdData {
  payment: Payment;
}

export interface CreatePaymentData {
  createPayment: Payment;
}

export interface UserPaymentsData {
  userPayments: Payment[];
}

// ==================== ESTADISTICAS ====================
export interface DashboardStats {
  totalRestaurants: number;
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  ordersToday: number;
  revenueToday: number;
  topRestaurants: Restaurant[];
  recentOrders: Order[];
}

// ==================== RESERVAS ====================
export interface Booking {
  id: string;
  restaurantId: string;
  userId: string;
  user?: User;
  tableId: string;
  people: number;
  time: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
}

export interface BookingData {
  bookings: Booking[];
}

export interface BookingData {
  bookingsUser: Booking[];
}
