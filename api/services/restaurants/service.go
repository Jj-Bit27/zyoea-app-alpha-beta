// internal/restaurants/service.go
package restaurants

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv" // Necesario para convertir string ID a int ID
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	// Ajusta el path según tu module name (go.mod)
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
func (s *Service) Create(ctx context.Context, input model.CreateRestaurantInput) (*model.Restaurant, error) {
	var id int
	phoneAsString := input.Phone

	sql := `
		INSERT INTO restaurants (name, address, email, description, image, phone, hours)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id
	`

	err := s.DB.QueryRow(ctx, sql,
		input.Name,
		input.Address,
		input.Email,
		input.Description,
		input.Image,
		phoneAsString,
		input.Hours,
	).Scan(&id)

	if err != nil {
		return nil, fmt.Errorf("error al crear restaurante: %w", err)
	}

	var b model.Restaurant
	b.ID = fmt.Sprintf("%d", id)
	b.Name = input.Name
	b.Address = input.Address
	b.Email = input.Email
	b.Description = input.Description
	b.Image = input.Image
	b.Phone = phoneAsString
	b.Hours = input.Hours

	cacheKey := "restaurants:all"
	cacheKeyRestaurant := fmt.Sprintf("restaurant:%d", id)

	_, err = s.Redis.Get(ctx, cacheKey).Result()
	if err == nil {
		err = s.Redis.Del(ctx, cacheKey, cacheKeyRestaurant).Err()
	}

	return &b, nil
}

// ---------------------------------------------------------
// OBTENER TODOS
// ---------------------------------------------------------
func (s *Service) FindAllByRestaurant(ctx context.Context) ([]*model.Restaurant, error) {

	key := "restaurants:all"

	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		// Si encontramos datos, los convertimos de JSON a Structs
		var restaurants []*model.Restaurant
		if err := json.Unmarshal([]byte(val), &restaurants); err == nil {
			return restaurants, nil
		}
	}

	sql := `SELECT id, name, address, email, description, image, phone, hours FROM restaurants`

	rows, err := s.DB.Query(ctx, sql)
	if err != nil {
		return nil, fmt.Errorf("error al consultar restaurantes: %w", err)
	}
	defer rows.Close()

	var results []*model.Restaurant
	for rows.Next() {
		var b model.Restaurant
		var id int
		var phoneStr string
		// Escaneamos las columnas en orden
		err := rows.Scan(&id, &b.Name, &b.Address, &b.Email, &b.Description, &b.Image, &phoneStr, &b.Hours)
		if err != nil {
			return nil, err
		}
		b.Phone = phoneStr
		b.ID = fmt.Sprintf("%d", id)
		results = append(results, &b)
	}

	data, _ := json.Marshal(results)

	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return results, nil
}

// ---------------------------------------------------------
// OBTENER UNO EN ESPECÍFICO (GetByID)
// ---------------------------------------------------------
func (s *Service) FindOne(ctx context.Context, id string) (*model.Restaurant, error) {
	// 1. Convertir ID de string (GraphQL) a int (Postgres)
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("el ID debe ser un número: %w", err)
	}

	key := fmt.Sprintf("restaurant:%d", dbID)

	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		// Si encontramos datos, los convertimos de JSON a Structs
		var restaurant *model.Restaurant
		if err := json.Unmarshal([]byte(val), &restaurant); err == nil {
			return restaurant, nil
		}
	}

	sql := `SELECT id, name, address, email, description, image, phone, hours FROM restaurants WHERE id = $1`

	var b model.Restaurant
	var idScanned int

	// 2. Ejecutar Query
	err = s.DB.QueryRow(ctx, sql, dbID).Scan(
		&idScanned,
		&b.Name,
		&b.Address,
		&b.Email,
		&b.Description,
		&b.Image,
		&b.Phone,
		&b.Hours,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("restaurante con id %s no encontrado", id)
		}
		return nil, err
	}

	b.ID = fmt.Sprintf("%d", idScanned)
	data, _ := json.Marshal(&b)

	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return &b, nil
}

// ---------------------------------------------------------
// EDITAR (Update)
// ---------------------------------------------------------
// Nota: Asumo que tienes un input 'UpdateBookingInput' en tu schema.
// Si usas 'CreateBookingInput' para editar, cambia el tipo del argumento 'input'.
func (s *Service) Update(ctx context.Context, id string, input model.UpdateRestaurantInput) (*model.Restaurant, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("ID inválido: %w", err)
	}

	// Usamos RETURNING para obtener los datos actualizados y confirmar que se hizo
	sql := `
		UPDATE restaurants 
		SET name = $1, address = $2, email = $3, description = $4, image = $5, phone = $6, hours = $7
		WHERE id = $8
		RETURNING id, name, address, email, description, image, phone, hours
	`

	var b model.Restaurant
	var idScanned int

	// Asumiendo que el input de update tiene campos opcionales, aquí asumimos que envías todo.
	// Si son opcionales (punteros), necesitarías lógica extra para construir la query dinámicamente.
	err = s.DB.QueryRow(ctx, sql,
		input.Name,
		input.Address,
		input.Email,
		input.Description,
		input.Image,
		input.Phone,
		input.Hours,
		dbID, // El ID va al final por el WHERE
	).Scan(&idScanned, &b.Name, &b.Address, &b.Email, &b.Description, &b.Image, &b.Phone, &b.Hours)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("no se encontró el restaurante para actualizar")
		}
		return nil, fmt.Errorf("error al actualizar: %w", err)
	}

	cacheKey := "restaurants:all"
	cacheKeyRestaurant := fmt.Sprintf("restaurant:%d", dbID)

	_, err = s.Redis.Get(ctx, cacheKey).Result()
	if err == nil {
		err = s.Redis.Del(ctx, cacheKey, cacheKeyRestaurant).Err()
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

	sql := `DELETE FROM restaurants WHERE id = $1 RETURNING id`

	var restaurantID int

	err = s.DB.QueryRow(ctx, sql, dbID).Scan(&restaurantID)
	if err != nil {
		// Si da el error "ErrNoRows", significa que el ID de la categoría no existía
		if err == pgx.ErrNoRows {
			return false, nil // Retornamos falso, no se borró nada
		}
		return false, fmt.Errorf("error al eliminar el restaurante: %w", err)
	}

	cacheKey := "restaurants:all"
	cacheKeyRestaurant := fmt.Sprintf("restaurant:%d", dbID)

	err = s.Redis.Del(ctx, cacheKey, cacheKeyRestaurant).Err()

	return true, nil // Se borró con éxito
}
