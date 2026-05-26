// ==================== USUARIOS ====================
export interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  isVerified: boolean;
  allergies?: string;
}

export interface UserWithRestaurant {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  isVerified: boolean;
  restaurant?: number;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
  restaurant?: number;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: string;
}

export interface LoginInput {
  email: string;
  password: string;
  restaurant?: number;
}

// ==================== RESTAURANTES ====================
export interface Restaurant {
  id: string;
  name: string;
  description: string;
  image?: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  rating?: number;
  createdAt?: string;
}

export interface RestaurantData {
  restaurants: Restaurant[];
}

export interface RestaurantByIdData {
  restaurant: Restaurant;
}

export interface CreateRestaurantInput {
  name: string;
  address: string;
  email: string;
  description: string;
  image?: string;
  phone: string;
  hours: string;
}

export interface UpdateRestaurantInput {
  id: string;
  name?: string;
  address?: string;
  email?: string;
  description?: string;
  image?: string;
  phone?: string;
  hours?: string;
}

// ==================== CATEGORIAS ====================
export interface Category {
  id: string;
  restaurantId: number;
  name: string;
  description?: string;
  image?: string;
  productCount?: number;
  createdAt?: string;
}

export interface CategoryData {
  categories: Category[];
}

export interface CategoryByIdData {
  category: Category;
}

export interface CreateCategoryInput {
  restaurant: number;
  name: string;
}

export interface UpdateCategoryInput {
  id: string;
  restaurant?: number;
  name?: string;
}

// ==================== PRODUCTOS ====================
export interface Product {
  id: string;
  restaurantId: number;
  categoryId: number;
  name: string;
  description?: string;
  ingredients?: string;
  allergens?: string;
  price: number;
  status: boolean;
  image?: string;
  category?: Category;
  restaurant?: Restaurant;
  isAvailable?: boolean;
  createdAt?: string;
}

export interface ProductData {
  products: Product[];
}

export interface CreateProductInput {
  restaurant: number;
  category: number;
  name: string;
  description?: string;
  ingredients?: string;
  allergens?: string;
  price: number;
  status: boolean;
  image?: string;
}

export interface UpdateProductInput {
  id: string;
  restaurant?: number;
  category?: number;
  name?: string;
  description?: string;
  ingredients?: string;
  allergens?: string;
  price?: number;
  status?: boolean;
  image?: string;
}

// ==================== ORDENES ====================
export interface OrderItem {
  id: string;
  productId: number;
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  userId: number;
  user: User;
  user_name: string;
  restaurantId: number;
  restaurant: Restaurant;
  status: string;
  type: string;
  total: number;
  notes?: string;
  tableId?: number;
  date: string;
  paid: boolean;
  orderDetail?: OrderDetail;
  estimatedWaitTime?: number;
  actualWaitTime?: number | null;
  completedAt?: string | null;
  // Extended fields used in frontend
  paymentStatus?: string;
  paymentMethod?: string;
  items?: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderDetail {
  id: string;
  order: number;
  productId: number;
  product: Product;
  quantity: number;
  subtotal: number;
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

export interface OrderItemInput {
  productId: number;
  quantity: number;
  subtotal: number;
}

export interface CreateOrderInput {
  user: number;
  user_name: string;
  restaurant: number;
  status: string;
  type: string;
  total: number;
  notes?: string;
  table?: number;
  paid?: boolean;
  items: OrderItemInput[];
}

export interface UpdateOrderInput {
  id: string;
  estado?: string;
}

// ==================== BOOKINGS (Reservas) ====================
export interface Booking {
  id: string;
  restaurantId: number;
  userId: number;
  tableId: number;
  people: number;
  time: string;
  status: string;
  user?: User;
  restaurant?: Restaurant;
}

export interface BookingData {
  bookings: Booking[];
}

export interface BookingsUserData {
  bookingsUser: Booking[];
}

export interface CreateBookingInput {
  restaurant: number;
  user: number;
  table: number;
  people: number;
  time: string;
  status: string;
}

export interface UpdateBookingInput {
  id: string;
  restaurant?: number;
  user?: number;
  table?: number;
  people?: number;
  time?: string;
  status?: string;
}

// ==================== RESENAS ====================
export interface Review {
  id: string;
  restaurantId: number;
  userId: number;
  rating: number;
  comment: string;
  date: string;
  user?: User;
  restaurant?: Restaurant;
  // Extended fields for frontend compatibility
  title?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewsData {
  reviews: Review[];
}

export interface CreateReviewInput {
  restaurant: number;
  user: number;
  rating: number;
  comment: string;
}

export interface UpdateReviewInput {
  id: string;
  restaurant?: number;
  user?: number;
  rating?: number;
  comment?: string;
}

// ==================== MESAS ====================
export interface Table {
  id: string;
  restaurantId: number;
  number: number;
  capacity: number;
  status: string;
  bookingId?: number;
  restaurant?: Restaurant;
  booking?: Booking;
  currentOrderId?: string;
}

export interface TableData {
  tables: Table[];
}

export interface CreateTableInput {
  restaurant: number;
  number: number;
  capacity: number;
  status: string;
}

export interface UpdateTableInput {
  id: string;
  restaurant?: number;
  number?: number;
  bookingId?: number;
  capacity?: number;
  status?: string;
}

// ==================== EMPLEADOS ====================
export interface Employee {
  id: string;
  restaurantId: number;
  userId: number;
  position: string;
  hireDate?: string;
  user?: User;
  restaurant?: Restaurant;
  isActive?: boolean;
}

export interface EmployeeData {
  employeesByRestaurant: Employee[];
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  password: string;
  role: string;
  restaurantId: number;
  position: string;
}

export interface UpdateEmployeeInput {
  id: string;
  name?: string;
  email?: string;
  restaurantId?: number;
  position?: string;
}

// ==================== PAGOS ====================
export interface Payment {
  id: string;
  userId: string;
  user: User;
  stripePaymentIntentId: string;
  stripePaymentMethodId?: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  // Extended fields for frontend compatibility
  orderId?: string;
  method?: string;
  cashReceived?: number;
  change?: number;
  cardLast4?: string;
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

export interface CreatePaymentInput {
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  description?: string;
  orderId?: number;
}

export interface RefundPaymentInput {
  payment: string;
  amount?: number;
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
