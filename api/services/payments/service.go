// internal/payments/service.go
package payments

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/paymentintent"
	"github.com/stripe/stripe-go/v76/refund"

	"api/graph/model"
)

type Service struct {
	DB        *pgxpool.Pool
	StripeKey string
}

func NewService(db *pgxpool.Pool, stripeKey string) *Service {
	stripe.Key = stripeKey
	return &Service{
		DB:        db,
		StripeKey: stripeKey,
	}
}

// ---------------------------------------------------------
// CREAR PAGO
// ---------------------------------------------------------
func (s *Service) Create(ctx context.Context, input model.CreatePaymentInput) (*model.Payment, error) {
	// Convertir monto a centavos para Stripe
	amountInCents := int64(input.Amount * 100)

	// Crear Payment Intent en Stripe
	params := &stripe.PaymentIntentParams{
		Amount:        stripe.Int64(amountInCents),
		Currency:      stripe.String(input.Currency),
		PaymentMethod: stripe.String(input.PaymentMethodID),
		Confirm:       stripe.Bool(true),
		AutomaticPaymentMethods: &stripe.PaymentIntentAutomaticPaymentMethodsParams{
			Enabled:        stripe.Bool(true),
			AllowRedirects: stripe.String("never"),
		},
	}

	if input.Description != nil {
		params.Description = stripe.String(*input.Description)
	}

	// Ejecutar pago en Stripe
	pi, err := paymentintent.New(params)
	if err != nil {
		// Si falla, guardar como fallido
		return s.saveFailedPayment(ctx, input, err)
	}

	// Mapear estado de Stripe
	status := s.mapStripeStatus(pi.Status)

	// Guardar en base de datos
	var id int
	sql := `
		INSERT INTO payments ("user", stripe_payment_intent_id, stripe_payment_method_id, amount, currency, status, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`

	var createdAt, updatedAt time.Time
	description := ""
	if input.Description != nil {
		description = *input.Description
	}

	err = s.DB.QueryRow(ctx, sql,
		input.UserID,
		pi.ID,
		input.PaymentMethodID,
		input.Amount,
		input.Currency,
		status,
		description,
	).Scan(&id, &createdAt, &updatedAt)

	if err != nil {
		return nil, fmt.Errorf("error al guardar pago en BD: %w", err)
	}

	return &model.Payment{
		ID:                    fmt.Sprintf("%d", id),
		UserID:                input.UserID,
		StripePaymentIntentID: pi.ID,
		StripePaymentMethodID: &input.PaymentMethodID,
		Amount:                input.Amount,
		Currency:              input.Currency,
		Status:                status,
		Description:           input.Description,
		CreatedAt:             createdAt.Format(time.RFC3339),
		UpdatedAt:             updatedAt.Format(time.RFC3339),
	}, nil
}

// ---------------------------------------------------------
// OBTENER TODOS LOS PAGOS
// ---------------------------------------------------------
func (s *Service) GetAll(ctx context.Context, limit, offset int) ([]*model.Payment, error) {
	sql := `
		SELECT 
			id, "user", stripe_payment_intent_id, stripe_payment_method_id,
			amount, currency, status, description, created_at, updated_at
		FROM payments
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := s.DB.Query(ctx, sql, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("error al consultar pagos: %w", err)
	}
	defer rows.Close()

	var results []*model.Payment
	for rows.Next() {
		payment, err := s.scanPayment(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, payment)
	}

	return results, nil
}

// ---------------------------------------------------------
// OBTENER PAGOS POR USUARIO
// ---------------------------------------------------------
func (s *Service) GetByUserID(ctx context.Context, userID string) ([]*model.Payment, error) {
	sql := `
		SELECT 
			id, "user", stripe_payment_intent_id, stripe_payment_method_id,
			amount, currency, status, description, created_at, updated_at
		FROM payments
		WHERE "user" = $1
		ORDER BY created_at DESC
	`

	rows, err := s.DB.Query(ctx, sql, userID)
	if err != nil {
		return nil, fmt.Errorf("error al consultar pagos del usuario: %w", err)
	}
	defer rows.Close()

	var results []*model.Payment
	for rows.Next() {
		payment, err := s.scanPayment(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, payment)
	}

	return results, nil
}

// ---------------------------------------------------------
// OBTENER PAGO POR ID
// ---------------------------------------------------------
func (s *Service) GetByID(ctx context.Context, id string) (*model.Payment, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("el ID debe ser un número: %w", err)
	}

	sql := `
		SELECT 
			id, "user", stripe_payment_intent_id, stripe_payment_method_id,
			amount, currency, status, description, created_at, updated_at
		FROM payments
		WHERE id = $1
	`

	row := s.DB.QueryRow(ctx, sql, dbID)
	payment, err := s.scanPaymentRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("pago con id %s no encontrado", id)
		}
		return nil, err
	}

	return payment, nil
}

// ---------------------------------------------------------
// REEMBOLSAR PAGO
// ---------------------------------------------------------
func (s *Service) Refund(ctx context.Context, id string, amount *float64) (*model.Payment, error) {
	// Obtener el pago
	payment, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if payment.Status != "succeeded" {
		return nil, fmt.Errorf("solo se pueden reembolsar pagos exitosos")
	}

	// Crear reembolso en Stripe
	refundParams := &stripe.RefundParams{
		PaymentIntent: stripe.String(payment.StripePaymentIntentID),
	}

	if amount != nil {
		refundParams.Amount = stripe.Int64(int64(*amount * 100))
	}

	_, err = refund.New(refundParams)
	if err != nil {
		return nil, fmt.Errorf("error al crear reembolso en Stripe: %w", err)
	}

	// Actualizar estado en BD
	dbID, _ := strconv.Atoi(id)
	sql := `
		UPDATE payments
		SET status = 'refunded', updated_at = NOW()
		WHERE id = $1
		RETURNING id, "user", stripe_payment_intent_id, stripe_payment_method_id,
		          amount, currency, status, description, created_at, updated_at
	`

	row := s.DB.QueryRow(ctx, sql, dbID)
	updatedPayment, err := s.scanPaymentRow(row)
	if err != nil {
		return nil, fmt.Errorf("error al actualizar estado: %w", err)
	}

	return updatedPayment, nil
}

// ---------------------------------------------------------
// ACTUALIZAR ESTADO
// ---------------------------------------------------------
func (s *Service) UpdateStatus(ctx context.Context, id string, status string) (*model.Payment, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("ID inválido: %w", err)
	}

	sql := `
		UPDATE payments
		SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, "user", stripe_payment_intent_id, stripe_payment_method_id,
		          amount, currency, status, description, created_at, updated_at
	`

	row := s.DB.QueryRow(ctx, sql, status, dbID)
	payment, err := s.scanPaymentRow(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("pago no encontrado")
		}
		return nil, fmt.Errorf("error al actualizar estado: %w", err)
	}

	return payment, nil
}

// ---------------------------------------------------------
// HELPERS
// ---------------------------------------------------------

func (s *Service) saveFailedPayment(ctx context.Context, input model.CreatePaymentInput, stripeErr error) (*model.Payment, error) {
	var id int
	sql := `
		INSERT INTO payments (
			"user", 
			stripe_payment_intent_id, 
			stripe_payment_method_id,
			amount, 
			currency, 
			status,
			description,
			created_at,
			updated_at
		) VALUES ($1, $2, $3, $4, $5, 'failed', $6, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`

	var createdAt, updatedAt time.Time
	description := ""
	if input.Description != nil {
		description = *input.Description
	}

	err := s.DB.QueryRow(ctx, sql,
		input.UserID,
		"failed_"+input.PaymentMethodID,
		input.PaymentMethodID,
		input.Amount,
		input.Currency,
		description,
	).Scan(&id, &createdAt, &updatedAt)

	if err != nil {
		return nil, fmt.Errorf("error al procesar pago: %v, error al guardar: %w", stripeErr, err)
	}

	return nil, fmt.Errorf("error al procesar pago con Stripe: %w", stripeErr)
}

func (s *Service) mapStripeStatus(status stripe.PaymentIntentStatus) string {
	switch status {
	case stripe.PaymentIntentStatusSucceeded:
		return "succeeded"
	case stripe.PaymentIntentStatusProcessing:
		return "processing"
	case stripe.PaymentIntentStatusRequiresPaymentMethod:
		return "requires_payment_method"
	case stripe.PaymentIntentStatusRequiresConfirmation:
		return "requires_confirmation"
	case stripe.PaymentIntentStatusRequiresAction:
		return "requires_action"
	case stripe.PaymentIntentStatusCanceled:
		return "canceled"
	default:
		return "pending"
	}
}

func (s *Service) scanPayment(rows pgx.Rows) (*model.Payment, error) {
	var p model.Payment
	var id int
	var createdAt, updatedAt time.Time
	var stripePaymentMethodID, description *string

	err := rows.Scan(
		&id,
		&p.User,
		&p.StripePaymentIntentID,
		&stripePaymentMethodID,
		&p.Amount,
		&p.Currency,
		&p.Status,
		&description,
		&createdAt,
		&updatedAt,
	)

	if err != nil {
		return nil, err
	}

	p.ID = fmt.Sprintf("%d", id)
	p.StripePaymentMethodID = stripePaymentMethodID
	p.Description = description
	p.CreatedAt = createdAt.Format(time.RFC3339)
	p.UpdatedAt = updatedAt.Format(time.RFC3339)

	return &p, nil
}

func (s *Service) scanPaymentRow(row pgx.Row) (*model.Payment, error) {
	var p model.Payment
	var id int
	var createdAt, updatedAt time.Time
	var stripePaymentMethodID, description *string

	err := row.Scan(
		&id,
		&p.User,
		&p.StripePaymentIntentID,
		&stripePaymentMethodID,
		&p.Amount,
		&p.Currency,
		&p.Status,
		&description,
		&createdAt,
		&updatedAt,
	)

	if err != nil {
		return nil, err
	}

	p.ID = fmt.Sprintf("%d", id)
	p.StripePaymentMethodID = stripePaymentMethodID
	p.Description = description
	p.CreatedAt = createdAt.Format(time.RFC3339)
	p.UpdatedAt = updatedAt.Format(time.RFC3339)

	return &p, nil
}
