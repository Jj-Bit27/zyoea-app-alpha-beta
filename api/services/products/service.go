// internal/products/service.go
package products

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"api/graph/model"
)

type Service struct {
	DB    *pgxpool.Pool
	Redis *redis.Client
}

func NewService(db *pgxpool.Pool, rdb *redis.Client) *Service {
	return &Service{
		DB:    db,
		Redis: rdb, // Inyectamos Redis
	}
}

// ---------------------------------------------------------
// CREAR
// ---------------------------------------------------------
func (s *Service) Create(ctx context.Context, input model.CreateProductInput) (*model.Product, error) {
	var id int
	sql := `
		INSERT INTO products (restaurant, category, "name", "description", price, ingredients, allergens, "status", image)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`

	err := s.DB.QueryRow(ctx, sql,
		input.Restaurant,
		input.Category,
		input.Name,
		input.Description,
		input.Price,
		input.Ingredients,
		input.Allergens,
		input.Status,
		input.Image,
	).Scan(&id)

	if err != nil {
		return nil, fmt.Errorf("error al crear el producto: %w", err)
	}

	var b model.Product
	b.ID = fmt.Sprintf("%d", id)
	b.RestaurantID = input.Restaurant
	b.CategoryID = input.Category
	b.Name = input.Name
	b.Description = input.Description
	b.Price = input.Price
	b.Ingredients = input.Ingredients
	b.Allergens = input.Allergens
	b.Status = input.Status
	b.Image = input.Image

	cacheKey := fmt.Sprintf("products:restaurant:%d", input.Restaurant)
	cacheKeyProduct := fmt.Sprintf("product:%d", id)

	_, err = s.Redis.Get(ctx, cacheKey).Result()
	if err == nil {
		err = s.Redis.Del(ctx, cacheKey, cacheKeyProduct).Err()
	}

	return &b, nil
}

// ---------------------------------------------------------
// OBTENER TODOS
// ---------------------------------------------------------
func (s *Service) FindAllByRestaurant(ctx context.Context, restaurant string) ([]*model.Product, error) {
	dbID, err := strconv.Atoi(restaurant)

	if err != nil {
		return nil, fmt.Errorf("el identificador del restaurante debe ser un número: %w", err)
	}

	key := fmt.Sprintf("products:restaurant:%d", dbID)

	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		// Si encontramos datos, los convertimos de JSON a Structs
		var products []*model.Product
		if err := json.Unmarshal([]byte(val), &products); err == nil {
			return products, nil
		}
	}

	sql := `SELECT 
			p.id, p."name", p."description", p.price, p.ingredients, p.allergens, p."status", p.image,
			r.id, r."name",
			c.id, c."name"
		FROM products p
		INNER JOIN restaurants r ON p.restaurant = r.id
		INNER JOIN categories c ON p.category = c.id
		WHERE p.restaurant = $1`

	rows, err := s.DB.Query(ctx, sql, dbID)
	if err != nil {
		return nil, fmt.Errorf("error al consultar productos: %w", err)
	}
	defer rows.Close()

	var results []*model.Product
	for rows.Next() {
		var b model.Product
		var r model.Restaurant
		var c model.Category
		var id int
		err := rows.Scan(
			&id, &b.Name, &b.Description, &b.Price, &b.Ingredients, &b.Allergens, &b.Status, &b.Image,
			&r.ID, &r.Name, // Datos del restaurante
			&c.ID, &c.Name, // Datos de la categoría
		)
		if err != nil {
			return nil, err
		}
		b.ID = fmt.Sprintf("%d", id)

		b.Restaurant = &r
		b.Category = &c
		results = append(results, &b)
	}
	data, _ := json.Marshal(results)

	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return results, nil
}

// ---------------------------------------------------------
// OBTENER UNO EN ESPECÍFICO (GetByID)
// ---------------------------------------------------------
func (s *Service) FindOne(ctx context.Context, id string) (*model.Product, error) {
	// 1. Convertir ID de string (GraphQL) a int (Postgres)
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("el ID debe ser un número: %w", err)
	}

	key := fmt.Sprintf("product:%d", dbID)

	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		// Si encontramos datos, los convertimos de JSON a Structs
		var product *model.Product
		if err := json.Unmarshal([]byte(val), &product); err == nil {
			return product, nil
		}
	}

	sql := `SELECT 
			p.id, p."name", p."description", p.price, p.ingredients, p.allergens, p."status", p.image,
			r.id, r."name",
			c.id, c."name"
		FROM products p
		INNER JOIN restaurants r ON p.restaurant = r.id
		INNER JOIN categories c ON p.category = c.id
		WHERE p.id = $1`

	var b model.Product
	var r model.Restaurant
	var c model.Category
	var idScanned int

	// 2. Ejecutar Query
	err = s.DB.QueryRow(ctx, sql, dbID).Scan(
		&idScanned,
		&b.Name,
		&b.Description,
		&b.Price,
		&b.Ingredients,
		&b.Allergens,
		&b.Status,
		&b.Image,
		&r.ID, &r.Name, // Datos del restaurante
		&c.ID, &c.Name, // Datos de la categoría
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, err
		}
		return nil, err
	}

	b.ID = fmt.Sprintf("%d", idScanned)
	b.Restaurant = &r
	b.Category = &c
	data, _ := json.Marshal(&b)

	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return &b, nil
}

// ---------------------------------------------------------
// EDITAR (Update)
// ---------------------------------------------------------
func (s *Service) Update(ctx context.Context, id string, input model.UpdateProductInput) (*model.Product, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("ID inválido: %w", err)
	}

	// Usamos RETURNING para obtener los datos actualizados y confirmar que se hizo
	sql := `
		WITH updated_product AS (
			UPDATE products 
			SET restaurant = $1, category = $2, "name" = $3, "description" = $4, price = $5, ingredients = $6, allergens = $7, "status" = $8, image = $9
			WHERE id = $10
			RETURNING id, restaurant, category, "name", "description", price, ingredients, allergens, "status", image
		)
		SELECT 
			p.id, p."name", p."description", p.price, p.ingredients, p.allergens, p."status", p.image,
			r.id, r."name",
			c.id, c."name"
		FROM updated_product p
		INNER JOIN restaurants r ON p.restaurant = r.id
		INNER JOIN categories c ON p.category = c.id;
	`

	var b model.Product
	var r model.Restaurant
	var c model.Category
	var idScanned int

	// Asumiendo que el input de update tiene campos opcionales, aquí asumimos que envías todo.
	// Si son opcionales (punteros), necesitarías lógica extra para construir la query dinámicamente.
	err = s.DB.QueryRow(ctx, sql,
		input.Restaurant,
		input.Category,
		input.Name,
		input.Description,
		input.Price,
		input.Ingredients,
		input.Allergens,
		input.Status,
		input.Image,
		dbID, // El ID va al final por el WHERE
	).Scan(&idScanned,
		&b.Name,
		&b.Description,
		&b.Price,
		&b.Ingredients,
		&b.Allergens,
		&b.Status,
		&b.Image,
		&r.ID, &r.Name, // Datos del restaurante
		&c.ID, &c.Name)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("no se encontró el producto para actualizar")
		}
		return nil, fmt.Errorf("error al actualizar: %w", err)
	}

	restID, err := strconv.Atoi(r.ID)

	cacheKey := fmt.Sprintf("products:restaurant:%d", input.Restaurant)
	cacheKeyProduct := fmt.Sprintf("product:%d", restID)

	b.Restaurant = &r
	b.Category = &c

	_, err = s.Redis.Get(ctx, cacheKey).Result()
	if err == nil {
		err = s.Redis.Del(ctx, cacheKey, cacheKeyProduct).Err()
		data, _ := json.Marshal(&b)

		s.Redis.Set(ctx, cacheKey, data, 10*time.Minute)
	}

	b.ID = fmt.Sprintf("%d", idScanned)
	return &b, nil
}

// ---------------------------------------------------------
// ELIMINAR (Delete)
// ---------------------------------------------------------
func (s *Service) Delete(ctx context.Context, id string) (bool, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return false, fmt.Errorf("ID inválido: %w", err)
	}

	sql := `DELETE FROM products WHERE id = $1 RETURNING restaurant`

	var restaurantID int

	err = s.DB.QueryRow(ctx, sql, dbID).Scan(&restaurantID)
	if err != nil {
		// Si da el error "ErrNoRows", significa que el ID de la categoría no existía
		if err == pgx.ErrNoRows {
			return false, nil // Retornamos falso, no se borró nada
		}
		return false, fmt.Errorf("error al eliminar producto: %w", err)
	}

	cacheKey := fmt.Sprintf("products:restaurant:%d", restaurantID)
	cacheKeyProduct := fmt.Sprintf("product:%d", dbID)

	s.Redis.Del(ctx, cacheKey, cacheKeyProduct)

	return true, nil // Se borró con éxito
}
