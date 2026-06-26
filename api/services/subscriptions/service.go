package subscriptions

import (
	"context"
	"fmt"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"api/graph/model"
)

type Service struct {
	DB *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{DB: db}
}

func (s *Service) GetPlans(ctx context.Context) ([]*model.SubscriptionPlan, error) {
	rows, err := s.DB.Query(ctx, `SELECT id, name, description, price, interval, stripe_price_id, features, max_restaurants, max_employees, max_products, created_at, updated_at FROM subscription_plans ORDER BY price`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var plans []*model.SubscriptionPlan
	for rows.Next() {
		var p model.SubscriptionPlan
		err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.Price, &p.Interval, &p.StripePriceID, &p.Features, &p.MaxRestaurants, &p.MaxEmployees, &p.MaxProducts, &p.CreatedAt, &p.UpdatedAt)
		if err != nil {
			return nil, err
		}
		plans = append(plans, &p)
	}
	return plans, nil
}

func (s *Service) GetByRestaurant(ctx context.Context, restaurantID string) (*model.RestaurantSubscription, error) {
	sql := `SELECT rs.id, rs.restaurant_id, rs.plan_id, rs.stripe_subscription_id, rs.status, rs.current_period_start, rs.current_period_end, rs.trial_end, rs.cancelled_at, rs.created_at, rs.updated_at,
		sp.id, sp.name, sp.description, sp.price, sp.interval, sp.stripe_price_id, sp.features, sp.max_restaurants, sp.max_employees, sp.max_products, sp.created_at, sp.updated_at
		FROM restaurant_subscriptions rs
		INNER JOIN subscription_plans sp ON rs.plan_id = sp.id
		WHERE rs.restaurant_id = $1`

	var rs model.RestaurantSubscription
	var sp model.SubscriptionPlan
	err := s.DB.QueryRow(ctx, sql, restaurantID).Scan(
		&rs.ID, &rs.RestaurantID, &rs.PlanID, &rs.StripeSubscriptionID, &rs.Status,
		&rs.CurrentPeriodStart, &rs.CurrentPeriodEnd, &rs.TrialEnd, &rs.CancelledAt,
		&rs.CreatedAt, &rs.UpdatedAt,
		&sp.ID, &sp.Name, &sp.Description, &sp.Price, &sp.Interval,
		&sp.StripePriceID, &sp.Features, &sp.MaxRestaurants, &sp.MaxEmployees,
		&sp.MaxProducts, &sp.CreatedAt, &sp.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	rs.Plan = &sp
	return &rs, nil
}

func (s *Service) Create(ctx context.Context, input model.CreateSubscriptionInput) (*model.RestaurantSubscription, error) {
	var id int
	sql := `INSERT INTO restaurant_subscriptions (restaurant_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end)
		VALUES ($1, $2, $3, 'active', $4, $5) RETURNING id`
	err := s.DB.QueryRow(ctx, sql, input.RestaurantID, input.PlanID, input.StripeSubscriptionID, input.CurrentPeriodStart, input.CurrentPeriodEnd).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("error al crear suscripción: %w", err)
	}

	return s.GetByRestaurant(ctx, strconv.Itoa(input.RestaurantID))
}

func (s *Service) GetAll(ctx context.Context) ([]*model.RestaurantSubscription, error) {
	sql := `SELECT rs.id, rs.restaurant_id, rs.plan_id, rs.stripe_subscription_id, rs.status, rs.current_period_start, rs.current_period_end, rs.trial_end, rs.cancelled_at, rs.created_at, rs.updated_at,
		sp.id, sp.name, sp.description, sp.price, sp.interval, sp.stripe_price_id, sp.features, sp.max_restaurants, sp.max_employees, sp.max_products, sp.created_at, sp.updated_at
		FROM restaurant_subscriptions rs
		INNER JOIN subscription_plans sp ON rs.plan_id = sp.id
		ORDER BY rs.created_at DESC`

	rows, err := s.DB.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []*model.RestaurantSubscription
	for rows.Next() {
		var rs model.RestaurantSubscription
		var sp model.SubscriptionPlan
		err := rows.Scan(
			&rs.ID, &rs.RestaurantID, &rs.PlanID, &rs.StripeSubscriptionID, &rs.Status,
			&rs.CurrentPeriodStart, &rs.CurrentPeriodEnd, &rs.TrialEnd, &rs.CancelledAt,
			&rs.CreatedAt, &rs.UpdatedAt,
			&sp.ID, &sp.Name, &sp.Description, &sp.Price, &sp.Interval,
			&sp.StripePriceID, &sp.Features, &sp.MaxRestaurants, &sp.MaxEmployees,
			&sp.MaxProducts, &sp.CreatedAt, &sp.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		rs.Plan = &sp
		subs = append(subs, &rs)
	}
	return subs, nil
}

func (s *Service) Cancel(ctx context.Context, restaurantID string) (*model.RestaurantSubscription, error) {
	now := time.Now()
	_, err := s.DB.Exec(ctx, `UPDATE restaurant_subscriptions SET status = 'cancelled', cancelled_at = $1 WHERE restaurant_id = $2`, now, restaurantID)
	if err != nil {
		return nil, fmt.Errorf("error al cancelar suscripción: %w", err)
	}
	return s.GetByRestaurant(ctx, restaurantID)
}
