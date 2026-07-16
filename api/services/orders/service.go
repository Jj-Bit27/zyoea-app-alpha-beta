package orders

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strconv"
	"time"

	"api/graph/model"
	websocket "api/libs"
	"api/services/messaging"
	"api/services/waittime"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	DB       *pgxpool.Pool
	DBRead   *pgxpool.Pool
	Hub      *websocket.OrderHub
	Producer *messaging.Producer
	WaitCalc *waittime.Calculator
	MetricsS *waittime.MetricsService
}

func NewService(db *pgxpool.Pool, hub *websocket.OrderHub) *Service {
	return &Service{
		DB:       db,
		DBRead:   db,
		Hub:      hub,
		WaitCalc: waittime.NewCalculator(db),
		MetricsS: waittime.NewMetricsService(db),
	}
}

func (s *Service) readDB() *pgxpool.Pool {
	return s.DBRead
}

// ---------------------------------------------------------
// 1. FIND BY RESTAURANT
// ---------------------------------------------------------
func (s *Service) FindAllByRestaurant(ctx context.Context, restaurantID string, limit int, offset int) ([]*model.Order, error) {
	restID, err := strconv.Atoi(restaurantID)
	if err != nil {
		return nil, fmt.Errorf("restaurantID debe ser numérico: %w", err)
	}

	sql := `
		SELECT o.id, o."user", o.user_name, o.restaurant, o.status, o.type, o.total, o.notes, o."table", o.date, o.paid, 
		       COALESCE(o.estimated_wait_time, 0), o.actual_wait_time, o.completed_at,
		       u.id, u."name", u.email, u."role", u.is_verified,
		       r.id, r."name", r.address, r.email
		FROM orders o
		LEFT JOIN users u ON o."user" = u.id
		LEFT JOIN restaurants r ON o.restaurant = r.id
		WHERE o.restaurant = $1
		ORDER BY o.id DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := s.readDB().Query(ctx, sql, restID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []*model.Order
	for rows.Next() {
		var o model.Order
		var notes *string
		var mesaId *int
		var actualWait *int
		var completedAt *time.Time

		var (
			uID   *int
			uName *string
			uMail *string
			uRole *string
			uVrf  *bool
			rID   *int
			rName *string
			rAddr *string
			rMail *string
		)

		err := rows.Scan(
			&o.ID, &o.UserID, &o.UserName, &o.RestaurantID, &o.Status,
			&o.Type, &o.Total, &notes, &mesaId, &o.Date, &o.Paid,
			&o.EstimatedWaitTime, &actualWait, &completedAt,
			&uID, &uName, &uMail, &uRole, &uVrf,
			&rID, &rName, &rAddr, &rMail,
		)
		if err != nil {
			return nil, err
		}
		o.Notes = notes
		o.TableID = mesaId
		o.ActualWaitTime = actualWait
		o.CompletedAt = completedAt

		if uID != nil {
			isVerified := false
			if uVrf != nil {
				isVerified = *uVrf
			}
			o.User = &model.User{
				ID:         fmt.Sprintf("%d", *uID),
				Name:       uName,
				Email:      uMail,
				Role:       uRole,
				IsVerified: isVerified,
			}
		}
		if rID != nil {
			o.Restaurant = &model.Restaurant{
				ID:      fmt.Sprintf("%d", *rID),
				Name:    safeStr(rName),
				Address: safeStr(rAddr),
				Email:   safeStr(rMail),
			}
		}
		orders = append(orders, &o)
	}
	return orders, nil
}

// ---------------------------------------------------------
// 2. FIND ONE (with User + Restaurant JOINs)
// ---------------------------------------------------------
func (s *Service) FindOne(ctx context.Context, id string) (*model.Order, error) {
	var o model.Order
	var notes *string
	var mesaId *int
	var actualWait *int
	var completedAt *time.Time

	var (
		uID   *int
		uName *string
		uMail *string
		uRole *string
		uVrf  *bool

		rID   *int
		rName *string
		rAddr *string
		rMail *string
	)

	sql := `
		SELECT o.id, o."user", o.user_name, o.restaurant, o.status, o.type, o.total, o.notes, o."table", o.date, o.paid,
		       COALESCE(o.estimated_wait_time, 0), o.actual_wait_time, o.completed_at,
		       u.id, u."name", u.email, u."role", u.is_verified,
		       r.id, r."name", r.address, r.email
		FROM orders o
		LEFT JOIN users u ON o."user" = u.id
		LEFT JOIN restaurants r ON o.restaurant = r.id
		WHERE o.id = $1
	`
	err := s.readDB().QueryRow(ctx, sql, id).Scan(
		&o.ID, &o.UserID, &o.UserName, &o.RestaurantID, &o.Status,
		&o.Type, &o.Total, &notes, &mesaId, &o.Date, &o.Paid,
		&o.EstimatedWaitTime, &actualWait, &completedAt,
		&uID, &uName, &uMail, &uRole, &uVrf,
		&rID, &rName, &rAddr, &rMail,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("pedido no encontrado")
		}
		return nil, err
	}
	o.Notes = notes
	o.TableID = mesaId
	o.ActualWaitTime = actualWait
	o.CompletedAt = completedAt

	if uID != nil {
		isVerified := false
		if uVrf != nil {
			isVerified = *uVrf
		}
		o.User = &model.User{
			ID:         fmt.Sprintf("%d", *uID),
			Name:       uName,
			Email:      uMail,
			Role:       uRole,
			IsVerified: isVerified,
		}
	}
	if rID != nil {
		o.Restaurant = &model.Restaurant{
			ID:      fmt.Sprintf("%d", *rID),
			Name:    safeStr(rName),
			Address: safeStr(rAddr),
			Email:   safeStr(rMail),
		}
	}
	return &o, nil
}

// CreateWithIdempotencyKey creates an order with deduplication.
func (s *Service) CreateWithIdempotencyKey(ctx context.Context, input model.CreateOrderInput, idempotencyKey string) (*model.Order, error) {
	if idempotencyKey != "" {
		// Check if order with this key already exists
		var existing model.Order
		err := s.DB.QueryRow(ctx, `
			SELECT id FROM orders WHERE idempotency_key = $1
		`, idempotencyKey).Scan(&existing.ID)
		if err == nil {
			// Already exists, return full order
			return s.FindOne(ctx, existing.ID)
		}
	}
	return s.CreateWithKey(ctx, input, idempotencyKey)
}

// CreateWithKey creates an order and stores the idempotency key.
func (s *Service) CreateWithKey(ctx context.Context, input model.CreateOrderInput, idempotencyKey string) (*model.Order, error) {
	order, err := s.Create(ctx, input)
	if err != nil {
		return nil, err
	}
	if idempotencyKey != "" {
		_, _ = s.DB.Exec(ctx, `UPDATE orders SET idempotency_key = $1 WHERE id = $2`, idempotencyKey, order.ID)
	}
	return order, nil
}

// ---------------------------------------------------------
// 3. CREATE (Transacción Maestra)
// ---------------------------------------------------------
func (s *Service) Create(ctx context.Context, input model.CreateOrderInput) (*model.Order, error) {
	// A. Iniciar Transacción
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// B. Calcular tiempo de espera estimado ANTES de insertar
	// Contar items en la orden
	itemCount := 0
	for _, item := range input.Items {
		itemCount += item.Quantity
	}

	// Usar el calculator para obtener el tiempo estimado
	estimatedWaitTime, err := s.WaitCalc.CalculateWaitTime(ctx, input.Restaurant, itemCount)
	if err != nil {
		// Si falla el cálculo, usar 0 pero no fallar toda la operación
		slog.Warn("error calculando tiempo de espera", "error", err)
		estimatedWaitTime = 0
	}

	// C. Insertar Pedido (Cabecera) CON el tiempo estimado
	var newOrder model.Order
	sqlOrder := `
		INSERT INTO orders ("user", user_name, restaurant, status, type, total, notes, "table", date, paid, estimated_wait_time)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, "user", user_name, restaurant, status, type, total, notes, "table", date, paid, estimated_wait_time
	`
	// Usamos fecha actual
	fecha := time.Now()

	// Determinar el valor de paid
	paidValue := false
	if input.Paid != nil {
		paidValue = *input.Paid
	}

	err = tx.QueryRow(ctx, sqlOrder,
		input.User, input.UserName, input.Restaurant, input.Status, input.Type, input.Total, input.Notes, input.Table, fecha, paidValue, estimatedWaitTime,
	).Scan(
		&newOrder.ID, &newOrder.UserID, &newOrder.UserName, &newOrder.RestaurantID,
		&newOrder.Status, &newOrder.Type, &newOrder.Total, &newOrder.Notes, &newOrder.TableID, &newOrder.Date, &newOrder.Paid, &newOrder.EstimatedWaitTime,
	)

	if err != nil {
		return nil, fmt.Errorf("error creando cabecera de pedido: %w", err)
	}

	// D. Insertar Detalles (Items) - Loop dentro de la transacción
	sqlDetail := `
		INSERT INTO order_details (order_id, product_id, quantity, subtotal)
		VALUES ($1, $2, $3, $4)
	`
	for _, item := range input.Items {
		_, err := tx.Exec(ctx, sqlDetail, newOrder.ID, item.ProductID, item.Quantity, item.Subtotal)
		if err != nil {
			return nil, fmt.Errorf("error insertando detalle de producto %d: %w", item.ProductID, err)
		}
	}

	// E. Commit ANTES de hacer broadcast
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// F. Update table status to occupied if this is a dine-in order with a table
	if input.Table != nil && input.Type == "dine_in" {
		tableID := strconv.Itoa(*input.Table)
		_, _ = s.DB.Exec(ctx, `UPDATE tables SET "status" = 'occupied' WHERE id = $1`, tableID)
	}

	// G. Broadcast DESPUÉS del commit para no enviar datos de transacción no confirmada
	RestID := strconv.Itoa(newOrder.RestaurantID)
	s.Hub.BroadcastToRestaurant(RestID, newOrder)

	// H. Publicar evento en RabbitMQ (best-effort, no bloquea)
	if s.Producer != nil {
		event := messaging.OrderEvent{
			Type:         "order.created",
			OrderID:      newOrder.ID,
			RestaurantID: newOrder.RestaurantID,
			Status:       newOrder.Status,
			Timestamp:    time.Now(),
		}
		if err := s.Producer.PublishOrderEvent(context.Background(), event); err != nil {
			slog.Warn("error publicando evento en rabbitmq", "error", err)
		}
	}

	return &newOrder, nil
}

// ---------------------------------------------------------
// 4. UPDATE STATUS (con Broadcast a Cocina)
// ---------------------------------------------------------
func (s *Service) Update(ctx context.Context, input model.UpdateOrderInput) (*model.Order, error) {
	if input.Estado == nil {
		return nil, errors.New("el estado es obligatorio para actualizar")
	}

	// Obtener la orden actual antes de actualizarla
	currentOrder, err := s.FindOne(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	// Si la orden pasa a COMPLETADA o PAGADO, auto-crear payment y liberar mesa
	if *input.Estado == "COMPLETADA" || *input.Estado == "PAGADO" {
		// Auto-crear payment si no existe
		var existingCount int
		s.DB.QueryRow(ctx, `SELECT COUNT(*) FROM payments WHERE order_id = $1`, input.ID).Scan(&existingCount)
		if existingCount == 0 {
			s.DB.QueryRow(ctx,
				`INSERT INTO payments ("user", order_id, stripe_payment_intent_id, stripe_payment_method_id, amount, currency, status, description, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING id`,
				strconv.Itoa(currentOrder.UserID), input.ID, "auto_"+input.ID, "auto", currentOrder.Total, "MXN", "succeeded",
				fmt.Sprintf("Pago automático - Orden #%s", input.ID),
			)
		}
	}

	// Actualizar el status (y paid si es COMPLETADA/PAGADO)
	if *input.Estado == "COMPLETADA" || *input.Estado == "PAGADO" {
		_, err = s.DB.Exec(ctx, `UPDATE orders SET status = $1, paid = true WHERE id = $2`, *input.Estado, input.ID)
	} else {
		_, err = s.DB.Exec(ctx, `UPDATE orders SET status = $1 WHERE id = $2`, *input.Estado, input.ID)
	}
	if err != nil {
		return nil, err
	}

	// Liberar mesa
	if currentOrder.TableID != nil && (*input.Estado == "COMPLETADA" || *input.Estado == "PAGADO" || *input.Estado == "CANCELADA") {
		tableID := strconv.Itoa(*currentOrder.TableID)
		_, _ = s.DB.Exec(ctx, `UPDATE tables SET "status" = 'available' WHERE id = $1`, tableID)
	}

	// Registrar las métricas
	if *input.Estado == "COMPLETADA" || *input.Estado == "PAGADO" {
		orderID, err := strconv.Atoi(currentOrder.ID)
		if err == nil {
			err := s.MetricsS.OnOrderStatusUpdate(ctx, currentOrder.RestaurantID, orderID, *input.Estado, currentOrder.Date)
			if err != nil {
				slog.Warn("error registrando métricas", "error", err)
			}
		}
	}

	updated, err := s.FindOne(ctx, input.ID)
	if err != nil {
		return nil, err
	}

	// Broadcast a la cocina y al usuario en tiempo real
	restID := strconv.Itoa(updated.RestaurantID)
	s.Hub.BroadcastToRestaurant(restID, updated)

	// Publicar evento en RabbitMQ
	if s.Producer != nil {
		event := messaging.OrderEvent{
			Type:         "order.updated",
			OrderID:      input.ID,
			RestaurantID: updated.RestaurantID,
			Status:       *input.Estado,
			Timestamp:    time.Now(),
		}
		if err := s.Producer.PublishOrderEvent(context.Background(), event); err != nil {
			slog.Warn("error publicando evento en rabbitmq", "error", err)
		}
	}

	return updated, nil
}

// ---------------------------------------------------------
// 5. REMOVE (Transacción Manual)
// ---------------------------------------------------------
func (s *Service) Delete(ctx context.Context, id string) (bool, error) {
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	// A. Borrar Detalles primero
	_, err = tx.Exec(ctx, "DELETE FROM order_details WHERE order_id = $1", id)
	if err != nil {
		return false, err
	}

	// B. Borrar Pedido
	tag, err := tx.Exec(ctx, "DELETE FROM orders WHERE id = $1", id)
	if err != nil {
		return false, err
	}

	if tag.RowsAffected() == 0 {
		return false, errors.New("pedido no encontrado")
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}
	return true, nil
}

// ---------------------------------------------------------
// HELPER: GetDetails (Para el Resolver)
// ---------------------------------------------------------
func (s *Service) GetDetailsByOrderID(ctx context.Context, orderID string) ([]*model.OrderDetail, error) {
	sql := `SELECT id, order_id, product_id, quantity, subtotal FROM order_details WHERE order_id = $1`

	rows, err := s.readDB().Query(ctx, sql, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var details []*model.OrderDetail
	for rows.Next() {
		var d model.OrderDetail
		rows.Scan(&d.ID, &d.Order, &d.ProductID, &d.Quantity, &d.Subtotal)
		details = append(details, &d)
	}
	return details, nil
}

// ---------------------------------------------------------
// 6. UPDATE STATUS (Cambiar estado ABIERTA→LISTA→PAGADA→etc)
// ---------------------------------------------------------
func (s *Service) UpdateStatus(ctx context.Context, id string, newStatus string) (*model.Order, error) {
	sql := `UPDATE orders SET status = $1 WHERE id = $2`
	tag, err := s.DB.Exec(ctx, sql, newStatus, id)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, errors.New("pedido no encontrado")
	}
	return s.FindOne(ctx, id)
}

// ---------------------------------------------------------
// 7. UPDATE PAID STATUS (Marcar como pagado)
// ---------------------------------------------------------
func (s *Service) UpdatePaidStatus(ctx context.Context, id string, paid bool) (*model.Order, error) {
	order, err := s.FindOne(ctx, id)
	if err != nil {
		return nil, err
	}

	if paid && !order.Paid {
		// Auto-crear payment record si no existe uno para esta orden
		var existingCount int
		s.DB.QueryRow(ctx, `SELECT COUNT(*) FROM payments WHERE order_id = $1`, id).Scan(&existingCount)
		if existingCount == 0 {
			var paymentID int
			err := s.DB.QueryRow(ctx,
				`INSERT INTO payments ("user", order_id, stripe_payment_intent_id, stripe_payment_method_id, amount, currency, status, description, created_at, updated_at)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING id`,
				strconv.Itoa(order.UserID), id, "auto_"+id, "auto", order.Total, "MXN", "succeeded",
				fmt.Sprintf("Pago automático - Orden #%s", id),
			).Scan(&paymentID)
			if err != nil {
				return nil, fmt.Errorf("error creando pago automático: %w", err)
			}
		}

		// Actualizar status y paid
		sql := `UPDATE orders SET paid = true, status = 'COMPLETADA' WHERE id = $1`
		tag, err := s.DB.Exec(ctx, sql, id)
		if err != nil {
			return nil, err
		}
		if tag.RowsAffected() == 0 {
			return nil, errors.New("pedido no encontrado")
		}

		// Liberar mesa si existe
		if order.TableID != nil {
			tableID := strconv.Itoa(*order.TableID)
			s.DB.Exec(ctx, `UPDATE tables SET "status" = 'available' WHERE id = $1`, tableID)
		}

		// Registrar métricas
		orderID, _ := strconv.Atoi(id)
		if orderID > 0 {
			s.MetricsS.OnOrderStatusUpdate(ctx, order.RestaurantID, orderID, "COMPLETADA", order.Date)
		}
	} else {
		sql := `UPDATE orders SET paid = $1 WHERE id = $2`
		_, err := s.DB.Exec(ctx, sql, paid, id)
		if err != nil {
			return nil, err
		}
	}

	updated, err := s.FindOne(ctx, id)
	if err != nil {
		return nil, err
	}
	restID := strconv.Itoa(updated.RestaurantID)
	s.Hub.BroadcastToRestaurant(restID, updated)
	return updated, nil
}

// ---------------------------------------------------------
// 8. FIND OPEN ORDERS BY RESTAURANT (Para dashboard del mesero)
// ---------------------------------------------------------
func (s *Service) FindOpenOrdersByRestaurant(ctx context.Context, restaurantID string) ([]*model.Order, error) {
	restID, err := strconv.Atoi(restaurantID)
	if err != nil {
		return nil, fmt.Errorf("restaurantID debe ser numérico: %w", err)
	}

	sql := `
		SELECT o.id, o."user", o.user_name, o.restaurant, o.status, o.type, o.total, o.notes, o."table", o.date, o.paid,
		       COALESCE(o.estimated_wait_time, 0), o.actual_wait_time, o.completed_at,
		       u.id, u."name", u.email, u."role", u.is_verified,
		       r.id, r."name", r.address, r.email
		FROM orders o
		LEFT JOIN users u ON o."user" = u.id
		LEFT JOIN restaurants r ON o.restaurant = r.id
		WHERE o.restaurant = $1 AND o.status IN ('ABIERTA', 'LISTA')
		ORDER BY o.date DESC
	`
	rows, err := s.readDB().Query(ctx, sql, restID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []*model.Order
	for rows.Next() {
		var o model.Order
		var notes *string
		var mesaId *int
		var actualWait *int
		var completedAt *time.Time

		var (
			uID   *int
			uName *string
			uMail *string
			uRole *string
			uVrf  *bool
			rID   *int
			rName *string
			rAddr *string
			rMail *string
		)

		err := rows.Scan(
			&o.ID, &o.UserID, &o.UserName, &o.RestaurantID, &o.Status,
			&o.Type, &o.Total, &notes, &mesaId, &o.Date, &o.Paid,
			&o.EstimatedWaitTime, &actualWait, &completedAt,
			&uID, &uName, &uMail, &uRole, &uVrf,
			&rID, &rName, &rAddr, &rMail,
		)
		if err != nil {
			return nil, err
		}
		o.Notes = notes
		o.TableID = mesaId
		o.ActualWaitTime = actualWait
		o.CompletedAt = completedAt

		if uID != nil {
			isVerified := false
			if uVrf != nil {
				isVerified = *uVrf
			}
			o.User = &model.User{
				ID:         fmt.Sprintf("%d", *uID),
				Name:       uName,
				Email:      uMail,
				Role:       uRole,
				IsVerified: isVerified,
			}
		}
		if rID != nil {
			o.Restaurant = &model.Restaurant{
				ID:      fmt.Sprintf("%d", *rID),
				Name:    safeStr(rName),
				Address: safeStr(rAddr),
				Email:   safeStr(rMail),
			}
		}
		orders = append(orders, &o)
	}
	return orders, nil
}

// KitchenOrderResponse is the JSON shape for the kitchen REST endpoint
type KitchenOrderResponse struct {
	ID       string                  `json:"id"`
	UserID   int                     `json:"userId"`
	UserName string                  `json:"user_name"`
	RestID   int                     `json:"restaurantId"`
	Status   string                  `json:"status"`
	Type     string                  `json:"type"`
	Total    float64                 `json:"total"`
	Notes    *string                 `json:"notes,omitempty"`
	TableID  *int                    `json:"tableId,omitempty"`
	Date     time.Time               `json:"date"`
	Paid     bool                    `json:"paid"`
	Details  []KitchenDetailResponse `json:"orderDetail"`
}

type KitchenDetailResponse struct {
	ID        string                  `json:"id"`
	ProductID int                     `json:"productId"`
	Quantity  int                     `json:"quantity"`
	Subtotal  float64                 `json:"subtotal"`
	Product   *KitchenProductResponse `json:"product,omitempty"`
}

type KitchenProductResponse struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Price float64 `json:"price"`
	Image *string `json:"image,omitempty"`
}

func (s *Service) FindOpenOrdersWithDetails(ctx context.Context, restaurantID string) ([]KitchenOrderResponse, error) {
	orders, err := s.FindOpenOrdersByRestaurant(ctx, restaurantID)
	if err != nil {
		return nil, err
	}
	if len(orders) == 0 {
		return []KitchenOrderResponse{}, nil
	}

	var ids []int
	for _, o := range orders {
		id, _ := strconv.Atoi(o.ID)
		ids = append(ids, id)
	}

	detailSQL := `SELECT od.id, od.order_id, od.product_id, od.quantity, od.subtotal,
		COALESCE(p.id::text, ''), COALESCE(p.name, ''), COALESCE(p.price, 0), p.image
		FROM order_details od
		LEFT JOIN products p ON od.product_id = p.id
		WHERE od.order_id = ANY($1)
		ORDER BY od.id`

	dRows, err := s.readDB().Query(ctx, detailSQL, ids)
	if err != nil {
		return nil, fmt.Errorf("error fetching order details: %w", err)
	}
	defer dRows.Close()

	detailMap := make(map[int][]KitchenDetailResponse)
	for dRows.Next() {
		var d KitchenDetailResponse
		var prod KitchenProductResponse
		var orderID int
		var image *string
		err := dRows.Scan(&d.ID, &orderID, &d.ProductID, &d.Quantity, &d.Subtotal,
			&prod.ID, &prod.Name, &prod.Price, &image)
		if err != nil {
			return nil, fmt.Errorf("error scanning detail row: %w", err)
		}
		prod.Image = image
		d.Product = &prod
		detailMap[orderID] = append(detailMap[orderID], d)
	}

	result := make([]KitchenOrderResponse, 0, len(orders))
	for _, o := range orders {
		oid, _ := strconv.Atoi(o.ID)
		details := detailMap[oid]
		if details == nil {
			details = []KitchenDetailResponse{}
		}
		result = append(result, KitchenOrderResponse{
			ID:       o.ID,
			UserID:   o.UserID,
			UserName: o.UserName,
			RestID:   o.RestaurantID,
			Status:   o.Status,
			Type:     o.Type,
			Total:    o.Total,
			Notes:    o.Notes,
			TableID:  o.TableID,
			Date:     o.Date,
			Paid:     o.Paid,
			Details:  details,
		})
	}
	return result, nil
}

// ---------------------------------------------------------
// 9. FIND ORDERS BY USER (Para "Mis Órdenes" del cliente)
// ---------------------------------------------------------
func (s *Service) FindAllByUser(ctx context.Context, userID string) ([]*model.Order, error) {
	uid, err := strconv.Atoi(userID)
	if err != nil {
		return nil, fmt.Errorf("userID debe ser numérico: %w", err)
	}

	sql := `
		SELECT o.id, o."user", o.user_name, o.restaurant, o.status, o.type, o.total, o.notes, o."table", o.date, o.paid,
		       COALESCE(o.estimated_wait_time, 0), o.actual_wait_time, o.completed_at,
		       u.id, u."name", u.email, u."role", u.is_verified,
		       r.id, r."name", r.address, r.email
		FROM orders o
		LEFT JOIN users u ON o."user" = u.id
		LEFT JOIN restaurants r ON o.restaurant = r.id
		WHERE o."user" = $1
		ORDER BY o.date DESC
	`
	rows, err := s.readDB().Query(ctx, sql, uid)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []*model.Order
	for rows.Next() {
		var o model.Order
		var notes *string
		var mesaId *int
		var actualWait *int
		var completedAt *time.Time

		var (
			uID   *int
			uName *string
			uMail *string
			uRole *string
			uVrf  *bool
			rID   *int
			rName *string
			rAddr *string
			rMail *string
		)

		err := rows.Scan(
			&o.ID, &o.UserID, &o.UserName, &o.RestaurantID, &o.Status,
			&o.Type, &o.Total, &notes, &mesaId, &o.Date, &o.Paid,
			&o.EstimatedWaitTime, &actualWait, &completedAt,
			&uID, &uName, &uMail, &uRole, &uVrf,
			&rID, &rName, &rAddr, &rMail,
		)
		if err != nil {
			return nil, err
		}
		o.Notes = notes
		o.TableID = mesaId
		o.ActualWaitTime = actualWait
		o.CompletedAt = completedAt

		if uID != nil {
			isVerified := false
			if uVrf != nil {
				isVerified = *uVrf
			}
			o.User = &model.User{
				ID:         fmt.Sprintf("%d", *uID),
				Name:       uName,
				Email:      uMail,
				Role:       uRole,
				IsVerified: isVerified,
			}
		}
		if rID != nil {
			o.Restaurant = &model.Restaurant{
				ID:      fmt.Sprintf("%d", *rID),
				Name:    safeStr(rName),
				Address: safeStr(rAddr),
				Email:   safeStr(rMail),
			}
		}
		orders = append(orders, &o)
	}
	return orders, nil
}

// ---------------------------------------------------------
// 10. ADD ITEMS TO EXISTING ORDER (Agregar productos a orden existente)
// ---------------------------------------------------------
func (s *Service) AddItems(ctx context.Context, orderID string, items []*model.OrderItemInput) (*model.Order, error) {
	// Verificar que la orden existe y está abierta o lista
	order, err := s.FindOne(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.Status != "ABIERTA" && order.Status != "LISTA" {
		return nil, errors.New("solo se pueden agregar productos a órdenes abiertas o en preparación")
	}

	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Insertar nuevos items
	sqlDetail := `INSERT INTO order_details (order_id, product_id, quantity, subtotal) VALUES ($1, $2, $3, $4)`
	var addedTotal float64
	for _, item := range items {
		_, err := tx.Exec(ctx, sqlDetail, orderID, item.ProductID, item.Quantity, item.Subtotal)
		if err != nil {
			return nil, fmt.Errorf("error insertando detalle de producto %d: %w", item.ProductID, err)
		}
		addedTotal += item.Subtotal
	}

	// Actualizar el total de la orden
	newTotal := order.Total + addedTotal
	sqlUpdate := `UPDATE orders SET total = $1 WHERE id = $2`
	_, err = tx.Exec(ctx, sqlUpdate, newTotal, orderID)
	if err != nil {
		return nil, fmt.Errorf("error actualizando total: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	updatedOrder, err := s.FindOne(ctx, orderID)
	if err != nil {
		return nil, err
	}

	restID := strconv.Itoa(updatedOrder.RestaurantID)
	s.Hub.BroadcastToRestaurant(restID, updatedOrder)

	return updatedOrder, nil
}

// ---------------------------------------------------------
// 11. REMOVE ITEM FROM ORDER
// ---------------------------------------------------------
func (s *Service) RemoveItem(ctx context.Context, orderID string, itemID string) (*model.Order, error) {
	order, err := s.FindOne(ctx, orderID)
	if err != nil {
		return nil, err
	}
	if order.Status != "ABIERTA" {
		return nil, errors.New("solo se pueden quitar productos de órdenes abiertas")
	}

	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Obtener el subtotal del item antes de eliminarlo
	var itemSubtotal float64
	err = tx.QueryRow(ctx, `SELECT subtotal FROM order_details WHERE id = $1 AND order_id = $2`, itemID, orderID).Scan(&itemSubtotal)
	if err != nil {
		return nil, fmt.Errorf("item no encontrado en esta orden: %w", err)
	}

	// Eliminar el item
	tag, err := tx.Exec(ctx, `DELETE FROM order_details WHERE id = $1 AND order_id = $2`, itemID, orderID)
	if err != nil {
		return nil, err
	}
	if tag.RowsAffected() == 0 {
		return nil, errors.New("item no encontrado")
	}

	// Recalcular total
	newTotal := order.Total - itemSubtotal
	if newTotal < 0 {
		newTotal = 0
	}
	_, err = tx.Exec(ctx, `UPDATE orders SET total = $1 WHERE id = $2`, newTotal, orderID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	updated, err := s.FindOne(ctx, orderID)
	if err != nil {
		return nil, err
	}

	// Broadcast cambio en tiempo real
	restID := strconv.Itoa(updated.RestaurantID)
	s.Hub.BroadcastToRestaurant(restID, updated)

	return updated, nil
}

func safeStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
