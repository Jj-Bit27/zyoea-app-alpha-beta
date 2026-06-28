# Suavus App — Contexto Completo para IA

## Stack Tecnológico

| Capa       | Tecnología                                                |
|------------|-----------------------------------------------------------|
| Frontend   | Astro 5 + React 19 + TailwindCSS v4 + Nanostores          |
| Backend    | Go 1.21+ (Gin + gqlgen 0.17.90 + pgx v5)                 |
| DB         | PostgreSQL 15+ (RLS habilitado) + Redis (caché)           |
| Pagos      | Stripe (PaymentIntents + Connect)                         |
| OAuth      | Google (Facebook/Twitter comentados)                      |
| Desktop    | Tauri v2                                                  |
| Tiempo real| WebSocket (gorilla/websocket)                             |

---

## Estructura de Directorios

```
suavus-app-alpha-beta/
├── api/                          # Backend Go
│   ├── cmd/api/main.go           # Entry point, inyección de servicios
│   ├── database/
│   │   ├── database.sql          # Schema completo (955+ líneas)
│   │   ├── helpers.sql           # RLS helpers (current_user_id, etc.)
│   │   ├── postgres.go           # Pool de conexiones
│   │   ├── redis.go              # Cliente Redis
│   │   ├── migrate.go            # Runner de migraciones
│   │   └── migrations/           # Migraciones SQL (001-006)
│   ├── graph/
│   │   ├── schema.graphqls       # Schema GraphQL maestro (único que usa gqlgen)
│   │   ├── schema.resolvers.go   # Implementación de resolvers (644+ líneas)
│   │   ├── resolver.go           # Struct Resolver con todos los servicios
│   │   ├── model/models_gen.go   # Modelos generados por gqlgen (modificados manualmente)
│   │   └── generated/generated.go # Código generado por gqlgen
│   ├── services/
│   │   ├── auth/service.go       # Auth: register, login, JWT, verify, reset, update
│   │   ├── bookings/service.go   # CRUD reservas con Redis cache
│   │   ├── carts/service.go      # Carrito persistente
│   │   ├── categories/service.go # Categorías con Redis cache
│   │   ├── cloudinary/service.go # Subida de imágenes
│   │   ├── email/service.go      # Resend API: verificación, recovery y welcome
│   │   ├── employees/service.go  # CRUD empleados
│   │   ├── oauth/service.go      # Google OAuth
│   │   ├── orders/service.go     # CRUD órdenes con WebSocket broadcast
│   │   ├── payments/             # Stripe payments + Connect
│   │   ├── products/service.go   # CRUD productos con Redis cache
│   │   ├── restaurants/service.go # CRUD restaurantes con Redis cache
│   │   ├── reviews/service.go    # CRUD reseñas con Redis cache
│   │   ├── subscriptions/service.go # Planes y suscripciones
│   │   ├── tables/service.go     # CRUD mesas
│   │   ├── terms/service.go      # Términos y privacidad
│   │   └── waittime/             # Cálculo de tiempo de espera
│   ├── libs/hub.go               # WebSocket Hub para cocina
│   ├── middleware/ratelimit.go   # Rate limiting por IP y usuario
│   └── gqlgen.yml                # Configuración de gqlgen
│
├── web/                          # Frontend Astro + React
│   ├── astro.config.mjs
│   ├── package.json              # React 19, Apollo Client 4, Tailwind v4
│   └── src/
│       ├── components/
│       │   ├── admin/            # AdminStats, SubscriptionManager
│       │   ├── auth/             # LoginForm, RegisterForm, ForgotPassword, ResetPassword, VerifyEmail, OAuthCallback
│       │   ├── booking/          # BookingManager (usuario), StaffBookingManager
│       │   ├── custom/           # Button, Card, Input, Modal, Toast, Select, Badge, etc.
│       │   ├── layout/           # Navbar, Sidebar, Footer
│       │   ├── order/            # OrderManager, UserOrdersList, StaffOrderHistory, WaitTimeDisplay
│       │   ├── payment/          # PaymentFlow, CardPaymentForm
│       │   ├── profile/          # ProfileManager (alergias, nombre, email, eliminar cuenta)
│       │   ├── restaurant/       # RestaurantDetail, RestaurantManager
│       │   ├── staff/            # KitchenDashboard, TableManager, EmployeeManager
│       │   ├── table/            # QRScanner (nuevo)
│       │   ├── ticket/           # TicketManager
│       │   └── upload/           # ImageUploader (Cloudinary)
│       ├── hooks/                # useBookings, useOrders, useProducts, useAuth, etc.
│       ├── context/              # AuthContext, OrderContext, ThemeContext
│       ├── pages/                # login, register, bookings, staff/, admin/, profile, auth/
│       ├── types/index.ts        # Interfaces TypeScript (450+ líneas)
│       ├── libs/                 # apollo.ts, formatters.ts, ValidateEmail.ts, bookingConfig.ts
│       ├── middleware.ts         # Protección de rutas Astro
│       └── config.ts             # URLs de API/GraphQL/Frontend
```

---

## Base de Datos

### Tablas principales

| Tabla | Propósito | RLS |
|-------|-----------|-----|
| `restaurants` | Restaurantes con Stripe Connect | ✅ |
| `users` | Usuarios con verificación/reset tokens | ✅ |
| `employees` | Staff vinculado a restaurantes | ✅ |
| `tables` | Mesas con status (available/occupied/reserved/maintenance/cleaning) | ✅ |
| `categories` | Categorías de productos | ✅ |
| `products` | Menú con precio/alérgenos/imagen | ✅ |
| `reviews` | Reseñas con rating 1-5 | ✅ |
| `bookings` | Reservas con cancellation_reason | ✅ |
| `orders` | Pedidos con idempotency_key, wait_time fields | ✅ |
| `order_details` | Líneas de pedido | ✅ |
| `payments` | Pagos Stripe con order_id | ✅ |
| `user_carts` | Carrito persistente por usuario | ❌ |
| `restaurant_payment_methods` | Cuentas Stripe Connect | ❌ |
| `restaurant_wait_config` | Config cálculo tiempo espera | ❌ |
| `order_metrics` | Métricas de órdenes completadas | ❌ |
| `terms_acceptance` | Aceptación de términos | ❌ |
| `ip_rate_limits` | Rate limiting por IP | ❌ |
| `user_rate_limits` | Rate limiting por usuario | ❌ |
| `subscription_plans` | Planes de suscripción (nuevo) | ✅ |
| `restaurant_subscriptions` | Suscripciones activas (nuevo) | ✅ |

### Políticas RLS
- `current_user_id()` y `current_user_role()` se configuran vía `app.user_id` y `app.user_role`
- Roles: `admin`, `owner`, `staff`, `user`
- Las políticas permiten SELECT/INSERT/UPDATE/DELETE según rol y pertenencia

### Migraciones
| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `001_fix_orders_status_check.sql` | Fix constraint status (español) |
| 2 | `002_add_wait_time_fields.sql` | estimated_wait_time, actual_wait_time, completed_at |
| 3 | `003_create_wait_time_config.sql` | restaurant_wait_config, order_metrics |
| 4 | `004_add_booking_cancellation_reason.sql` | cancellation_reason en bookings |
| 5 | `005_add_order_detail_as_array.sql` | Index (cambio GraphQL-only) |
| 6 | `006_add_subscription_tables.sql` | subscription_plans, restaurant_subscriptions |

---

## GraphQL Schema (schema.graphqls)

### Tipos principales
```graphql
type User { id, name, email, role, isVerified, allergies }
type Restaurant { id, name, address, email, description, image, phone, hours }
type Booking { id, restaurantId, restaurant, userId, user, tableId, people, time, status, cancellationReason }
type Order { id, userId, user, user_name, restaurantId, restaurant, status, type, total, notes, tableId, date, paid, orderDetail: [OrderDetail!], estimatedWaitTime, actualWaitTime, completedAt }
type Product { id, restaurantId, restaurant, categoryId, category, name, description, ingredients, allergens, price, status, image }
type Review { id, restaurantId, restaurant, userId, user, rating, comment, date }
type Table { id, restaurantId, restaurant, bookingId, booking, number, capacity, status }
type SubscriptionPlan { id, name, description, price, interval, stripePriceId, features, maxRestaurants, maxEmployees, maxProducts }
type RestaurantSubscription { id, restaurantId, planId, plan, stripeSubscriptionId, status, currentPeriodStart, currentPeriodEnd, trialEnd, cancelledAt }
```

### Queries principales
- `restaurants`, `restaurant(id)`, `menu(restaurantId)`
- `bookings(restaurantId)`, `bookingsUser(userId)`, `booking(id)`
- `ordersByRestaurant`, `ordersOpen`, `ordersByUser`, `order`
- `products(restaurantId)`, `product(id)`
- `reviews(restaurantId)`, `review(id)`
- `tables(restaurantId)`, `table(id)`
- `categories(restaurantId)`, `category(id)`
- `employeesByRestaurant(restaurantId)`, `employee(id)`
- `getCart(userId)`, `userPayments(userId)`, `payment(id)`
- `subscriptionPlans`, `restaurantSubscription(restaurantId)`
- `totalUsers` (superadmin)
- `estimatedWaitTime`, `restaurantWaitMetrics`, `recentOrderMetrics`

### Mutaciones principales
- `register`, `login`, `verifyEmail`, `forgotPassword`, `resetPassword`
- `updateUser(id, name, email)`, `updateUserAllergies`, `deleteAccount`
- CRUD: `create/update/delete` para Restaurant, Booking, Product, Review, Table, Category, Employee
- `createOrder`, `updateOrderStatus`, `updateOrderPayment`, `addOrderItems`, `removeOrderItem`, `removeOrder`
- `addToCart`, `updateCartItem`, `removeFromCart`, `clearCart`
- `createPayment`, `refundPayment`
- `createSubscription`, `cancelSubscription`
- `acceptTerms`, `createRestaurantPaymentMethod`, etc.

### Subscripciones
- `orderCreated(restaurantId)`: Order!
- `orderStatusUpdated(restaurantId)`: Order!

---

## Backend Services

### Auth Service (`services/auth/service.go`)
- `Register`: Valida email/password, bcrypt hash, token 6 dígitos, JWT, envía email verificación
- `Login`: Busca usuario, verifica bcrypt, genera JWT con sub/role/restaurant
- `VerifyEmail`: Actualiza is_verified TRUE, limpia tokens, **envía welcome email en goroutine**
- `ForgotPassword`: Genera UUID, expiry 1h, envía email con link
- `ResetPassword`: Valida token + expiry, bcrypt nueva contraseña
- `UpdateUser`: Actualiza name/email con SQL dinámico
- `UpdateAllergies`: Actualiza campo allergies
- `DeleteAccount`: DELETE FROM users WHERE id
- `VerifyToken`: JWT parse + consulta DB + busca restaurant si es employee
- `GetUser`: SELECT por ID

### Booking Service (`services/bookings/service.go`)
- CRUD completo con Redis cache (10min TTL)
- `autoExpirePastBookings`: Cancela reservas pending con time < NOW()
- `Update`: SQL dinámico (solo campos no nil) — incluye cancellation_reason
- Cache invalidado en create/update/delete

### Order Service (`services/orders/service.go`)
- `CreateWithIdempotencyKey`: Deduplicación por UUID
- `Create`: Transacción (cabecera + detalles), calcula wait time, broadcast WebSocket, **actualiza mesa a "occupied" si es dine_in**
- `Update` (por estado): Actualiza status, **libera mesa si COMPLETADA/CANCELADA/PAGADO**, registra métricas, broadcast
- `FindOpenOrdersByRestaurant`: Filtra ABIERTA/LISTA
- `FindAllByUser`: Órdenes del cliente
- `AddItems`/`RemoveItem`: Modificar items + recalcular total + broadcast

### Table Service (`services/tables/service.go`)
- CRUD básico + `UpdateStatus` (nuevo) + `FindByRestaurantAndNumber` (nuevo)

### Subscription Service (`services/subscriptions/service.go`) [NUEVO]
- `GetPlans`: Lista planes ORDER BY price
- `GetByRestaurant`: JOIN con subscription_plans
- `Create`: INSERT con status='active'
- `Cancel`: UPDATE status='cancelled', cancelled_at=NOW()

### Email Service (`services/email/service.go`)
- Resend API (HTTP) con templates HTML responsivos
- `renderTemplate`: Base template compartida con header degradado naranja (#c2410c → #ea580c), footer con tagline y soporte
- `SendVerificationEmail`: Template con código 6 dígitos en panel destacado
- `SendWelcomeEmail`: Template de bienvenida post-verificación con CTA a restaurantes
- `SendPasswordRecoveryEmail`: Template con botón CTA + enlace alternativo

### Redis Cache Estrategia
- Claves: `bookings:restaurant:{id}`, `bookings:user:{id}`, `booking:{id}`, `restaurants`, `restaurant:{id}`, etc.
- TTL: 10 minutos
- Invalidación: Al crear/actualizar/eliminar, se elimina la clave si existe (GET + DEL)
- **Problema conocido**: Las consultas siempre van a Redis primero, si hay miss van a DB

---

## Frontend — Componentes Críticos

### Auth
- `LoginForm`: Email/password, Google OAuth, link a registro y forgot-password
- `RegisterForm`: Nombre/email/password, registro con rol "client"
- `ForgotPassword` (nuevo): Formulario email → mutation → mensaje éxito
- `ResetPassword` (nuevo): Lee token de URL, nuevo password + confirmación
- `VerifyEmail` (nuevo): Input código 6 dígitos → mutation verifyEmail
- `OAuthCallback`: Procesa callback OAuth con token en URL

### Booking (Reservas)
- `BookingManager`: CRUD usuario con modales. Status: pending/confirmed/cancelled/completed. Incluye **modal de cancelación con motivo** y **validación fecha pasada**
- `StaffBookingManager`: Vista staff con activas/historial, solo delete

### Profile
- `ProfileManager`: Avatar, **nombre/email editables**, selector alérgenos (14 opciones + texto libre), logout, **eliminar cuenta con doble confirmación**

### Staff
- `KitchenDashboard`: WebSocket + polling, tarjetas por orden con items, acciones por status
- `TableManager`: CRUD mesas, QR codes (qrcode.react), asignación a órdenes
- `EmployeeManager`: CRUD empleados, admin guard (oculta editar/borrar para no-superadmin)
- `StaffOrderHistory`: Historial de órdenes del restaurante

### Admin
- `SubscriptionManager` (nuevo): Grid de planes con features y botón seleccionar
- `AdminStats` (nuevo): Tarjetas total usuarios + restaurantes
- `RestaurantManager`: CRUD restaurantes con Cloudinary upload

### Custom Components
- `Modal`: Responsive (overlay + padding móvil), Header/Body/Footer slots
- `Toast`: Sistema de notificaciones vía nanostore (addToast)
- `ImageUploader`: Subida Cloudinary con preview y progress
- `QRScanner` (nuevo): Cámara + BarcodeDetector API + input manual fallback

### GraphQL Hooks Pattern
Cada hook sigue el patrón:
```tsx
const QUERY = gql`...`;
const MUTATION = gql`...`;
export function useX(id: string) {
  const { data } = useQuery(QUERY, { variables: { id }, skip: !id });
  const [mutate] = useMutation(MUTATION, { refetchQueries, onCompleted, onError });
  return { data: data?.x || [], mutate };
}
```

---

## Variables de Entorno Requeridas

### Backend (`api/.env`)
```
PORT=8080
DATABASE_URL=postgres://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=https://suavus.app
CLOUDINARY_URL=cloudinary://key:secret@cloud
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@suavus.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Frontend (`web/.env`)
```
PUBLIC_API_URL=http://localhost:8080
PUBLIC_GRAPHQL_URL=http://localhost:8080/query
PUBLIC_FRONTEND_URL=http://localhost:4321
```

---

## Flujos Clave

### Registro
1. Usuario llena formulario → `register()` en AuthContext
2. Backend: valida, bcrypt, inserta usuario, genera JWT, envía email verificación (goroutine)
3. Frontend: guarda token en cookie + localStorage, redirige a home
4. Usuario debe verificar email en `/auth/verify-email` con código de 6 dígitos
5. Al verificar, backend envía welcome email (goroutine)

### Recuperación de Contraseña
1. Usuario va a `/auth/forgot-password`, ingresa email → mutation `forgotPassword`
2. Backend: genera UUID, expiry 1h, guarda en DB, envía email con link
3. Usuario hace clic → `/auth/reset-password?token=UUID` → ingresa nueva contraseña → mutation `resetPassword`
4. Backend: valida token + expiry, bcrypt, limpia tokens

### Creación de Orden
1. Cliente selecciona productos (carrito en localStorage/DB)
2. `useCreateOrder` → mutation `createOrder` con `idempotencyKey` (UUID)
3. Backend: transacción (order + order_details), calcula estimated_wait_time, **marca mesa occupied si dine_in**
4. Broadcast WebSocket a cocina + notificación
5. Staff ve orden en KitchenDashboard, cambia status (ABIERTA → LISTA → COMPLETADA)

### Cancelación de Reserva
1. Usuario hace clic "Cancelar" → modal con textarea para motivo
2. `updateBooking(id, { status: "cancelled", cancellationReason })`
3. Backend: SQL dinámico solo actualiza status y cancellation_reason
4. Cache invalidado

---

## Decisiones Técnicas y Reglas

1. **Nunca regenerar `generated.go` sin verificar** — los modelos se modifican manualmente
2. **SQL dinámico** para Updates (evita sobrescribir campos no enviados con cero)
3. **Goroutines para emails** — no bloquear la respuesta al cliente
4. **Email via Resend API** — HTTP directo, no SMTP. Templates HTML compartidos con marca Suavus (colores #c2410c naranja, #ea580c gradient, #d97706 dorado)
4. **Mesa ocupada** se marca al crear orden dine_in, se libera al completar/cancelar
5. **Double confirm** para eliminar cuenta
6. **OrderDetail es array** (cambio de schema, frontend ya lo consume como array)
7. **Booking Update** ahora construye SET clause dinámicamente con `strings.Join`
8. **Cache Redis** se invalida condicionalmente (solo si existe)
9. **CORS** permite solo FRONTEND_URL configurado
10. **RLS** en todas las tablas principales — la conexión DB debe configurar `app.user_id` y `app.user_role`

---

## Regla Importante: `<ClientRouter />` Obligatorio

**Cada layout que use `client:only` o `client:load` con islands de React DEBE incluir `<ClientRouter />` de `astro:transitions` en el `<head>`.**
Sin `<ClientRouter />`, el runtime cliente de Astro nunca se carga y los `<astro-island>` se quedan como HTML vacío (no se hidratan).

| Layout | ¿Tiene ClientRouter? | Estado |
|--------|---------------------|--------|
| `Layout.astro` | ✅ | Correcto |
| `StaffLayout.astro` | ✅ | Correcto |
| `AdminLayout.astro` | ❌ → ✅ | **FIXED** |

## Bugs Conocidos y Fixes Recientes

| Bug | Fix |
|-----|-----|
| Admin/Staff sidebar no interactuaba | `client:only` en StaffSidebar (evita mismatch por `useAuth()`); `client:load` en AdminSidebar (no usa `useAuth`) |
| Admin sidebar no se mostraba | Faltaba `<ClientRouter />` en `AdminLayout.astro` |
| LoginForm/RegisterForm isLoading stuck | Manejo de errores en catch |
| LoginForm/RegisterForm isLoading stuck | Manejo de errores en catch |
| GetCart resolviendo array vacío | Unmarshal correcto de JSON |
| Review Update corrompiendo pointers | SQL dinámico (solo campos enviados) |
| Review modal cerrando incondicionalmente | isOpen condicional |
| Booking Update sobrescribía con ceros | SQL dinámico con strings.Join |
| EmployeeManager sin admin guard | Ocultar editar/borrar si no superadmin |
| ProductManager precio 0 aceptado | Validación > 0 |
| TableManager capacidad duplicados | Unique index restaurant+number |
| TableManager fake payment sin validación | Validar método de pago |
| StaffDashboard mesa ocupada count | Filtrar solo mesas del restaurante |
| QR table auto-assignment | localStorage qr_table_number |
| IdempotencyKey faltante en useStaffOrder | Agregado crypto.randomUUID |
| Ticket perforation dots responsive | CSS radial-gradient |
| Payment schema orderId | Columna agregada a tabla payments |
| Duplicado import "api/graph/model" | Eliminado en auth/service.go |
| Rate limiter desactivado (comentado en main.go) | Descomentado + fallback in-memory cuando Redis no disponible + detección IP real Cloudflare |

---

## Tareas Pendientes

- [ ] **Regenerar gqlgen**: Ejecutar `go run github.com/99designs/gqlgen generate` en `/api` para sincronizar `generated.go` con los cambios de schema
- [ ] **Verificar compilación Go**: `go build ./cmd/api` después de regenerar
- [ ] **Instalar dependencia Go**: `go mod tidy` si se agregan nuevos imports
- [ ] **Configurar Resend**: Agregar RESEND_API_KEY y EMAIL_FROM al .env del backend
- [ ] **Configurar Stripe subscription products**: Crear productos en Stripe y agregar stripe_price_id a subscription_plans
- [ ] **Facebook/Twitter OAuth**: Descomentar rutas en main.go cuando se necesiten
- [ ] **Paginación**: queries orders/payments/products sin paginación actualmente
- [ ] **WebSocket Apollo**: No está configurado (usa raw WebSocket en useKitchen)
- [ ] **Testing**: No hay tests unitarios actualmente

---

## Resultados de Load Testing (Fase 1 — 27 Jun 2026)

### Resumen

| Test | VUs | Duración | Requests | Errores | p95 | p99 | Máx |
|------|-----|----------|----------|---------|-----|-----|-----|
| Smoke | 1 | 10s | 10 | 0% | 536ms | 536ms | 536ms |
| Baseline | 10 | 1m | 450 | 0% | 438ms | 917ms | 919ms |
| Media | 30 | 2m | 2,808 | 0% | 433ms | 535ms | 911ms |
| Alta | 50 | 2m | 4,809 | 0% | 433ms | 531ms | 843ms |
| **Spike** | **200** | **100s** | **10,281** | **0%** | **2.58s** | **2.66s** | **3.07s** |
| Mutations | 5 | 40s | 88 | 28%† | 444ms | 505ms | 566ms |
| WebSocket | 10 | 70s | 19 | 0% | — | — | — |
| **Soak** | **30** | **30min** | **21,646** | **0%** | **469ms** | **1s** | **12s** |

† Errores en mutations corresponden a datos de prueba inexistentes (IDs de producto no válidos, cuenta login inexistente), no a bugs del backend. createBooking/createReview/acceptTerms funcionaron al 100%.

### Hallazgos Clave

| # | Hallazgo | Severidad | Recomendación |
|---|----------|-----------|---------------|
| 1 | **200 usuarios concurrentes sin errores** | ✅ | El servidor escala bien; la infraestructura (Cloudflare + PaaS) maneja picos |
| 2 | **p95 estable de ~430ms entre 10-50 VUs** | ✅ | Sin degradación en el rango normal de uso |
| 3 | **Respuesta máxima outlier de 12s en soak** | ⚠️ | Posible cold start de la PaaS o GC pause. Monitorear |
| 4 | **Rate limiter funcionando** | 🔴→✅ | **FIXED**: 93% de requests bloqueadas al exceder 30 req/min por IP. Fallback in-memory si Redis no está disponible |
| 5 | **Sin paginación en queries** | 🟡 | `restaurants`, `products`, `orders` no tienen paginación — payload crece con datos |
| 6 | **WebSocket funciona correctamente** | ✅ | Hub acepta conexiones, Cloudflare pasa WebSocket sin problema |
| 7 | **addToCart falla con FK constraint** | 🟡 | Product IDs aleatorios no existen en restaurantId=1; no es bug del backend |

### Recomendaciones Priorizadas

1. **✅ Rate limiter habilitado** — 30 req/min por IP, 100 req/min por usuario autenticado. Fallback in-memory si Redis no responde. IP real vía `CF-Connecting-IP` → `X-Real-Ip` → `X-Forwarded-For`.
2. **🟡 Agregar paginación** — `restaurants`, `products(restaurantId)`, `ordersByRestaurant` necesitan `limit`/`offset` para evitar payloads gigantes a futuro.
3. **🟡 Monitoreo de cold starts** — El outlier de 12s en soak sugiere que la PaaS hace scale-to-zero. Agregar health check + mantener 1 instancia siempre activa.
4. **🔬 Test de breakpoint** — El p95 a 200 VUs fue 2.58s (aceptable). Probar 500 VUs para encontrar el límite real de la infraestructura.

---

## Resultados Tests de Accesibilidad + E2E (Fase 2 — 27 Jun 2026)

### Lighthouse (Core Web Vitals)

| Ruta | Performance | Accesibilidad | Best Practices | SEO |
|------|------------|---------------|----------------|-----|
| `/` (Landing) | **93** | **86** | **100** | **91** |
| `/login` | **98** | **87** | **100** | **90** |

### axe-core (WCAG 2.1 AA)

13/13 páginas evaluadas. **0 violaciones críticas** en todas las rutas.

| Ruta | Violaciones | Críticas | Serias |
|------|------------|----------|--------|
| Landing (`/`) | 1 | 0 | 1 |
| Login (`/login`) | 1 | 0 | 1 |
| Register (`/register`) | 1 | 0 | 1 |
| Forgot Password (`/auth/forgot-password`) | 1 | 0 | 1 |
| Bookings (`/bookings`) | 1 | 0 | 1 |
| Profile (`/profile`) | 1 | 0 | 1 |
| Restaurants (`/restaurants`) | 1 | 0 | 1 |
| Staff Dashboard (`/staff/dashboard`) | 1 | 0 | 1 |
| Staff Orders (`/staff/orders`) | 1 | 0 | 1 |
| Staff Tables (`/staff/tables`) | 1 | 0 | 1 |
| Staff Employees (`/staff/employees`) | 1 | 0 | 1 |
| Admin Stats (`/admin/stats`) | 1 | 0 | 1 |
| Admin Subscriptions (`/admin/subscriptions`) | 1 | 0 | 1 |

**Única violación**: `link-name` — elementos `<a href="#">` en el sidebar sin texto discernible. Es la misma violación en todas las páginas.

### E2E Playwright

15/15 tests pasaron. Flujos cubiertos:
- Landing page carga, título correcto
- Login/Register muestran formularios con campos
- Forgot password redirige o muestra formulario
- Login con credenciales inválidas muestra error
- Staff/Admin pages redirigen a login sin sesión
- Navegación a restaurantes funciona
- Profile redirige a login sin sesión

---

## Cómo Trabajar con Este Archivo

1. **Al inicio de cada sesión**: Leer este archivo completo para restaurar el contexto
2. **Al hacer cambios significativos**: Actualizar este archivo (AGENTS.md) con los nuevos componentes, servicios, y decisiones
3. **Para encontrar código**: Buscar por nombre de archivo en la estructura de directorios arriba
4. **Para entender un flujo**: Seguir la cadena Page → Component → Hook → GQL Mutation → Resolver → Service → DB
