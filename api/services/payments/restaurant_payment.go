package payments

import (
	"context"
	"fmt"
	"time"

	"api/graph/model"

	"github.com/jackc/pgx/v5/pgxpool"
)

type RestaurantPaymentService struct {
	db *pgxpool.Pool
}

func NewRestaurantPaymentService(db *pgxpool.Pool) *RestaurantPaymentService {
	return &RestaurantPaymentService{db: db}
}

func (s *RestaurantPaymentService) GetPaymentMethod(ctx context.Context, restaurantID int) (*model.RestaurantPaymentMethod, error) {
	pm, err := s.scanPaymentMethod(ctx, restaurantID)
	if err != nil {
		return nil, err
	}
	if pm == nil {
		return nil, nil
	}
	pm.ID = fmt.Sprintf("%d", 0)
	pm.RestaurantID = fmt.Sprintf("%d", restaurantID)
	return pm, nil
}

func (s *RestaurantPaymentService) CreatePaymentMethod(ctx context.Context, restaurantID int, input model.CreateRestaurantPaymentMethodInput) (*model.RestaurantPaymentMethod, error) {
	countryCode := "MX"
	if input.CountryCode != nil {
		countryCode = *input.CountryCode
	}

	last4 := ""
	if len(input.RoutingNumber) >= 4 {
		last4 = input.RoutingNumber[len(input.RoutingNumber)-4:]
	}

	_, err := s.db.Exec(ctx, `
		INSERT INTO restaurant_payment_methods 
			(restaurant_id, account_holder_name, bank_account_last4, routing_number, country_code, status, account_type, activated_at)
		VALUES ($1, $2, $3, $4, $5, 'active', 'bank_account', NOW())
		ON CONFLICT (restaurant_id) 
		DO UPDATE SET 
			account_holder_name = $2,
			bank_account_last4 = $3,
			routing_number = $4,
			country_code = $5,
			status = 'active',
			activated_at = NOW()
	`, restaurantID, input.AccountHolderName, last4, input.RoutingNumber, countryCode)
	if err != nil {
		return nil, fmt.Errorf("create payment method: %w", err)
	}

	return &model.RestaurantPaymentMethod{
		ID:                        "0",
		RestaurantID:              fmt.Sprintf("%d", restaurantID),
		AccountHolderName:         input.AccountHolderName,
		AccountType:               "bank_account",
		BankAccountLast4:          &last4,
		RoutingNumber:             &input.RoutingNumber,
		CountryCode:               countryCode,
		Status:                    "active",
		StripeOnboardingCompleted: false,
		ActivatedAt:               timePtr(time.Now()),
		CreatedAt:                 time.Now(),
		UpdatedAt:                 time.Now(),
	}, nil
}

func (s *RestaurantPaymentService) scanPaymentMethod(ctx context.Context, restaurantID int) (*model.RestaurantPaymentMethod, error) {
	var pm model.RestaurantPaymentMethod
	var last4, routingNumber, stripeAccountID, stripeURL *string

	err := s.db.QueryRow(ctx, `
		SELECT 
			COALESCE(stripe_connect_account_id, ''),
			COALESCE(stripe_onboarding_url, ''),
			stripe_onboarding_completed,
			account_holder_name,
			account_type,
			bank_account_last4,
			routing_number,
			country_code,
			status,
			activated_at,
			created_at,
			updated_at
		FROM restaurant_payment_methods
		WHERE restaurant_id = $1 AND deleted_at IS NULL
	`, restaurantID).Scan(
		&stripeAccountID, &stripeURL, &pm.StripeOnboardingCompleted,
		&pm.AccountHolderName, &pm.AccountType,
		&last4, &routingNumber,
		&pm.CountryCode, &pm.Status,
		&pm.ActivatedAt, &pm.CreatedAt, &pm.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("scan payment method: %w", err)
	}

	if stripeAccountID != nil && *stripeAccountID != "" {
		pm.StripeConnectAccountID = stripeAccountID
	}
	if stripeURL != nil && *stripeURL != "" {
		pm.StripeOnboardingURL = stripeURL
	}
	if last4 != nil {
		pm.BankAccountLast4 = last4
	}
	if routingNumber != nil {
		pm.RoutingNumber = routingNumber
	}

	return &pm, nil
}

func timePtr(t time.Time) *time.Time {
	return &t
}
