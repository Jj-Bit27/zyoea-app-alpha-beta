package categories

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
	DB     *pgxpool.Pool
	DBRead *pgxpool.Pool
	Redis  *redis.Client
}

func NewService(db *pgxpool.Pool, rdb *redis.Client) *Service {
	return &Service{DB: db, DBRead: db, Redis: rdb}
}

func (s *Service) readDB() *pgxpool.Pool {
	return s.DBRead
}

const categorySelect = `SELECT c.id, c."name",
	r.id, r."name"`

const categoryFrom = `FROM categories c
	INNER JOIN restaurants r ON c.restaurant = r.id`

func scanCategory(scanner interface {
	Scan(dest ...interface{}) error
}) (*model.Category, error) {
	var b model.Category
	var id int
	var r model.Restaurant

	err := scanner.Scan(&id, &b.Name, &r.ID, &r.Name)
	if err != nil {
		return nil, err
	}

	b.ID = fmt.Sprintf("%d", id)
	b.Restaurant = &r
	return &b, nil
}

func (s *Service) Create(ctx context.Context, input model.CreateCategoryInput) (*model.Category, error) {
	var id int
	sql := `
		INSERT INTO categories (restaurant, "name")
		VALUES ($1, $2)
		RETURNING id
	`

	err := s.DB.QueryRow(ctx, sql,
		input.Restaurant,
		input.Name,
	).Scan(&id)

	if err != nil {
		return nil, fmt.Errorf("error al crear la categoría: %w", err)
	}

	var b model.Category
	b.ID = fmt.Sprintf("%d", id)
	b.RestaurantID = input.Restaurant
	b.Name = input.Name

	cacheKey := fmt.Sprintf("categories:restaurant:%d", input.Restaurant)

	_, err = s.Redis.Get(ctx, cacheKey).Result()
	if err == nil {
		err = s.Redis.Del(ctx, cacheKey).Err()
	}

	return &b, nil
}

func (s *Service) FindAllByRestaurant(ctx context.Context, restaurant string, limit int, offset int) ([]*model.Category, error) {
	dbID, err := strconv.Atoi(restaurant)
	if err != nil {
		return nil, fmt.Errorf("el identificador del restaurante debe ser un número: %w", err)
	}

	key := fmt.Sprintf("categories:restaurant:%d:%d:%d", dbID, limit, offset)
	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		var categories []*model.Category
		if err := json.Unmarshal([]byte(val), &categories); err == nil {
			return categories, nil
		}
	}

	sql := categorySelect + ` ` + categoryFrom + ` WHERE c.restaurant = $1 ORDER BY c.id LIMIT $2 OFFSET $3`

	rows, err := s.readDB().Query(ctx, sql, dbID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("error al consultar categorías: %w", err)
	}
	defer rows.Close()

	var results []*model.Category
	for rows.Next() {
		b, err := scanCategory(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, b)
	}

	data, _ := json.Marshal(results)
	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return results, nil
}

func (s *Service) FindOne(ctx context.Context, id string) (*model.Category, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("el ID debe ser un número: %w", err)
	}

	sql := `SELECT id, restaurant, "name" FROM categories WHERE id = $1`

	var b model.Category
	var idScanned, restID int

	err = s.readDB().QueryRow(ctx, sql, dbID).Scan(
		&idScanned,
		&restID,
		&b.Name,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("categoría con id %s no encontrada", id)
		}
		return nil, err
	}

	b.ID = fmt.Sprintf("%d", idScanned)
	b.RestaurantID = restID
	return &b, nil
}

func (s *Service) Update(ctx context.Context, id string, input model.UpdateCategoryInput) (*model.Category, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("ID inválido: %w", err)
	}

	sql := `
		UPDATE categories 
		SET restaurant = $1, "name" = $2
		WHERE id = $3
		RETURNING id, restaurant, "name"
	`
	var b model.Category
	var idScanned, restID int

	err = s.DB.QueryRow(ctx, sql,
		input.Restaurant,
		input.Name,
		dbID,
	).Scan(
		&idScanned,
		&restID,
		&b.Name,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("no se encontró la categoría para actualizar")
		}
		return nil, fmt.Errorf("error al actualizar: %w", err)
	}

	cacheKey := fmt.Sprintf("categories:restaurant:%d", input.Restaurant)

	_, err = s.Redis.Get(ctx, cacheKey).Result()
	if err == nil {
		err = s.Redis.Del(ctx, cacheKey).Err()
	}

	b.ID = fmt.Sprintf("%d", idScanned)
	b.RestaurantID = restID
	return &b, nil
}

func (s *Service) Delete(ctx context.Context, id string) (bool, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return false, fmt.Errorf("ID inválido: %w", err)
	}

	sql := `DELETE FROM categories WHERE id = $1 RETURNING restaurant`

	var restaurantID int
	err = s.DB.QueryRow(ctx, sql, dbID).Scan(&restaurantID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return false, fmt.Errorf("error al eliminar categoría: %w", err)
	}

	cacheKey := fmt.Sprintf("categories:restaurant:%d", restaurantID)
	s.Redis.Del(ctx, cacheKey)

	return true, nil
}
