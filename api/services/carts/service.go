package carts

import (
	"context"
	"fmt"
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	db *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{db: db}
}

func (s *Service) GetCart(ctx context.Context, userID int) ([]byte, error) {
	rows, err := s.db.Query(ctx, `
		SELECT uc.id, uc.product_id, p.name, p.image, uc.quantity, p.price, uc.restaurant_id
		FROM user_carts uc
		JOIN products p ON p.id = uc.product_id
		WHERE uc.user_id = $1
		ORDER BY uc.added_at ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("get cart: %w", err)
	}
	defer rows.Close()

	type cartItemJSON struct {
		ID           string  `json:"id"`
		ProductID    string  `json:"productId"`
		ProductName  string  `json:"productName"`
		ProductImage *string `json:"productImage,omitempty"`
		Quantity     int     `json:"quantity"`
		Price        float64 `json:"price"`
		RestaurantID string  `json:"restaurantId"`
	}

	var items []cartItemJSON
	for rows.Next() {
		var item cartItemJSON
		if err := rows.Scan(&item.ID, &item.ProductID, &item.ProductName, &item.ProductImage, &item.Quantity, &item.Price, &item.RestaurantID); err != nil {
			return nil, fmt.Errorf("scan cart item: %w", err)
		}
		items = append(items, item)
	}

	if items == nil {
		return []byte("[]"), nil
	}

	var result []byte
	result = append(result, '[')
	for i, item := range items {
		if i > 0 {
			result = append(result, ',')
		}
		result = append(result, '{')
		result = append(result, []byte(`"id":"`)...)
		result = append(result, []byte(item.ID)...)
		result = append(result, []byte(`","productId":"`)...)
		result = append(result, []byte(item.ProductID)...)
		result = append(result, []byte(`","productName":"`)...)
		result = append(result, []byte(item.ProductName)...)
		result = append(result, []byte(`","productImage":`)...)
		if item.ProductImage != nil {
			result = append(result, []byte(`"`+*item.ProductImage+`"`)...)
		} else {
			result = append(result, []byte("null")...)
		}
		result = append(result, []byte(fmt.Sprintf(`,"quantity":%d,"price":%f,"restaurantId":"%s"`, item.Quantity, item.Price, item.RestaurantID))...)
		result = append(result, '}')
	}
	result = append(result, ']')

	return result, nil
}

func (s *Service) AddToCart(ctx context.Context, userID, productID, quantity, restaurantID int) error {
	_, err := s.db.Exec(ctx, `
		INSERT INTO user_carts (user_id, product_id, quantity, restaurant_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (user_id, product_id)
		DO UPDATE SET quantity = user_carts.quantity + $3
	`, userID, productID, quantity, restaurantID)
	if err != nil {
		return fmt.Errorf("add to cart: %w", err)
	}
	return nil
}

func (s *Service) UpdateCartItem(ctx context.Context, userID, productID, quantity int) error {
	if quantity <= 0 {
		return s.RemoveFromCart(ctx, userID, productID)
	}
	_, err := s.db.Exec(ctx, `
		UPDATE user_carts SET quantity = $1
		WHERE user_id = $2 AND product_id = $3
	`, quantity, userID, productID)
	if err != nil {
		return fmt.Errorf("update cart item: %w", err)
	}
	return nil
}

func (s *Service) RemoveFromCart(ctx context.Context, userID, productID int) error {
	_, err := s.db.Exec(ctx, `
		DELETE FROM user_carts WHERE user_id = $1 AND product_id = $2
	`, userID, productID)
	if err != nil {
		return fmt.Errorf("remove from cart: %w", err)
	}
	return nil
}

func (s *Service) ClearCart(ctx context.Context, userID int) error {
	_, err := s.db.Exec(ctx, `DELETE FROM user_carts WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("clear cart: %w", err)
	}
	return nil
}

func (s *Service) getUserID(ctx context.Context) (int, error) {
	userIDStr := ctx.Value("userID")
	if userIDStr == nil {
		return 0, fmt.Errorf("usuario no autenticado")
	}
	id, err := strconv.Atoi(fmt.Sprintf("%v", userIDStr))
	if err != nil {
		return 0, fmt.Errorf("error obteniendo ID de usuario: %w", err)
	}
	return id, nil
}
