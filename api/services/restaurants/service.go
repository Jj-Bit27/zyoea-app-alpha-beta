package restaurants

import (
	"context"
	"encoding/json"
	"errors"
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
	DBRead *pgxpool.Pool
	Redis *redis.Client
}

func NewService(db *pgxpool.Pool, rdb *redis.Client) *Service {
	return &Service{DB: db, DBRead: db, Redis: rdb}
}

func NewServiceWithReadReplica(db *pgxpool.Pool, dbRead *pgxpool.Pool, rdb *redis.Client) *Service {
	if dbRead == nil {
		dbRead = db
	}
	return &Service{DB: db, DBRead: dbRead, Redis: rdb}
}

func (s *Service) readDB() *pgxpool.Pool {
	return s.DBRead
}

const restaurantSelect = `SELECT id, name, address, email, description, image, phone, hours`

func scanRestaurant(scanner interface {
	Scan(dest ...interface{}) error
}) (*model.Restaurant, error) {
	var b model.Restaurant
	var id int

	err := scanner.Scan(
		&id, &b.Name, &b.Address, &b.Email, &b.Description, &b.Image, &b.Phone, &b.Hours,
	)
	if err != nil {
		return nil, err
	}

	b.ID = fmt.Sprintf("%d", id)
	return &b, nil
}

func (s *Service) Create(ctx context.Context, input model.CreateRestaurantInput) (*model.Restaurant, error) {
	var id int
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
		input.Phone,
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
	b.Phone = input.Phone
	b.Hours = input.Hours

	cacheKey := "restaurants:all"
	cacheKeyRestaurant := fmt.Sprintf("restaurant:%d", id)

	_, err = s.Redis.Get(ctx, cacheKey).Result()
	if err == nil {
		err = s.Redis.Del(ctx, cacheKey, cacheKeyRestaurant).Err()
	}

	return &b, nil
}

func (s *Service) FindAllByRestaurant(ctx context.Context, limit int, offset int) ([]*model.Restaurant, error) {
	key := fmt.Sprintf("restaurants:all:%d:%d", limit, offset)

	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		var restaurants []*model.Restaurant
		if err := json.Unmarshal([]byte(val), &restaurants); err == nil {
			return restaurants, nil
		}
	}

	sql := restaurantSelect + ` FROM restaurants ORDER BY id LIMIT $1 OFFSET $2`

	rows, err := s.readDB().Query(ctx, sql, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("error al consultar restaurantes: %w", err)
	}
	defer rows.Close()

	var results []*model.Restaurant
	for rows.Next() {
		b, err := scanRestaurant(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, b)
	}

	data, _ := json.Marshal(results)
	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return results, nil
}

func (s *Service) FindOne(ctx context.Context, id string) (*model.Restaurant, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("el ID debe ser un número: %w", err)
	}

	key := fmt.Sprintf("restaurant:%d", dbID)
	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		var restaurant *model.Restaurant
		if err := json.Unmarshal([]byte(val), &restaurant); err == nil {
			return restaurant, nil
		}
	}

	sql := restaurantSelect + ` FROM restaurants WHERE id = $1`

	row := s.readDB().QueryRow(ctx, sql, dbID)
	b, err := scanRestaurant(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("restaurante con id %s no encontrado", id)
		}
		return nil, err
	}

	data, _ := json.Marshal(b)
	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return b, nil
}

func (s *Service) Update(ctx context.Context, id string, input model.UpdateRestaurantInput) (*model.Restaurant, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("ID inválido: %w", err)
	}

	sql := `
		UPDATE restaurants 
		SET name = $1, address = $2, email = $3, description = $4, image = $5, phone = $6, hours = $7
		WHERE id = $8
		RETURNING id, name, address, email, description, image, phone, hours
	`

	row := s.DB.QueryRow(ctx, sql,
		input.Name,
		input.Address,
		input.Email,
		input.Description,
		input.Image,
		input.Phone,
		input.Hours,
		dbID,
	)
	b, err := scanRestaurant(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("no se encontró el restaurante para actualizar")
		}
		return nil, fmt.Errorf("error al actualizar: %w", err)
	}

	cacheKey := "restaurants:all"
	cacheKeyRestaurant := fmt.Sprintf("restaurant:%d", dbID)

	_, err = s.Redis.Get(ctx, cacheKey).Result()
	if err == nil {
		s.Redis.Del(ctx, cacheKey, cacheKeyRestaurant)
	}

	return b, nil
}

func (s *Service) Delete(ctx context.Context, id string) (bool, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return false, fmt.Errorf("ID inválido: %w", err)
	}

	sql := `DELETE FROM restaurants WHERE id = $1 RETURNING id`

	var restaurantID int
	err = s.DB.QueryRow(ctx, sql, dbID).Scan(&restaurantID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return false, fmt.Errorf("error al eliminar el restaurante: %w", err)
	}

	cacheKey := "restaurants:all"
	cacheKeyRestaurant := fmt.Sprintf("restaurant:%d", dbID)

	s.Redis.Del(ctx, cacheKey, cacheKeyRestaurant)

	return true, nil
}
