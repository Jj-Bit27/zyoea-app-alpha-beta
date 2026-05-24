package reviews

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
	Redis *redis.Client
}

func NewService(db *pgxpool.Pool, rdb *redis.Client) *Service {
	return &Service{DB: db, Redis: rdb}
}

const reviewSelect = `SELECT rv.id, rv.restaurant, rv."user", rv.rating, rv.comment, rv."date",
	r.id, r."name",
	u.id, u."name"`

const reviewJoins = `FROM reviews rv
	INNER JOIN restaurants r ON rv.restaurant = r.id
	INNER JOIN users u ON rv."user" = u.id`

func scanReview(scanner interface {
	Scan(dest ...interface{}) error
}) (*model.Review, error) {
	var b model.Review
	var id, restID, userID int
	var rID, uID int
	var rName, uName string
	var date time.Time

	err := scanner.Scan(
		&id,
		&restID,
		&userID,
		&b.Rating,
		&b.Comment,
		&date,
		&rID, &rName,
		&uID, &uName,
	)
	if err != nil {
		return nil, err
	}

	b.ID = fmt.Sprintf("%d", id)
	b.RestaurantID = restID
	b.Restaurant = &model.Restaurant{
		ID:   strconv.Itoa(rID),
		Name: rName,
	}
	b.UserID = userID
	b.User = &model.User{
		ID:   strconv.Itoa(uID),
		Name: &uName,
	}
	b.Date = date
	return &b, nil
}

func (s *Service) Create(ctx context.Context, input model.CreateReviewInput) (*model.Review, error) {
	var id int
	sql := `
		INSERT INTO reviews (restaurant, "user", rating, comment)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	err := s.DB.QueryRow(ctx, sql,
		input.Restaurant,
		input.User,
		input.Rating,
		input.Comment,
	).Scan(&id)

	if err != nil {
		return nil, fmt.Errorf("error al crear el comentario: %w", err)
	}

	sqlGet := reviewSelect + ` ` + reviewJoins + ` WHERE rv.id = $1`
	row := s.DB.QueryRow(ctx, sqlGet, id)
	b, err := scanReview(row)
	if err != nil {
		return nil, fmt.Errorf("error al obtener comentario creado: %w", err)
	}

	return b, nil
}

func (s *Service) FindAllByRestaurant(ctx context.Context, restaurant string) ([]*model.Review, error) {
	dbID, err := strconv.Atoi(restaurant)
	if err != nil {
		return nil, fmt.Errorf("el identificador del restaurante debe ser un número: %w", err)
	}

	key := fmt.Sprintf("reviews:restaurant:%d", dbID)
	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		var reviews []*model.Review
		if err := json.Unmarshal([]byte(val), &reviews); err == nil {
			return reviews, nil
		}
	}

	sql := reviewSelect + ` ` + reviewJoins + ` WHERE rv.restaurant = $1`

	rows, err := s.DB.Query(ctx, sql, dbID)
	if err != nil {
		return nil, fmt.Errorf("error al consultar comentarios: %w", err)
	}
	defer rows.Close()

	var results []*model.Review
	for rows.Next() {
		b, err := scanReview(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, b)
	}

	data, _ := json.Marshal(results)
	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return results, nil
}

func (s *Service) FindOne(ctx context.Context, id string) (*model.Review, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("el ID debe ser un número: %w", err)
	}

	key := fmt.Sprintf("review:%d", dbID)
	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		var review *model.Review
		if err := json.Unmarshal([]byte(val), &review); err == nil {
			return review, nil
		}
	}

	sql := reviewSelect + ` ` + reviewJoins + ` WHERE rv.id = $1`
	row := s.DB.QueryRow(ctx, sql, dbID)
	b, err := scanReview(row)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("comentario con id %s no encontrado", id)
		}
		return nil, err
	}

	data, _ := json.Marshal(b)
	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return b, nil
}

func (s *Service) Update(ctx context.Context, id string, input model.UpdateReviewInput) (*model.Review, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("ID inválido: %w", err)
	}

	sql := `
		UPDATE reviews 
		SET restaurant = $1, "user" = $2, rating = $3, comment = $4
		WHERE id = $5
		RETURNING id
	`

	var updatedID int
	err = s.DB.QueryRow(ctx, sql,
		input.Restaurant,
		input.User,
		input.Rating,
		input.Comment,
		dbID,
	).Scan(&updatedID)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("no se encontró el comentario para actualizar")
		}
		return nil, fmt.Errorf("error al actualizar: %w", err)
	}

	sqlGet := reviewSelect + ` ` + reviewJoins + ` WHERE rv.id = $1`
	row := s.DB.QueryRow(ctx, sqlGet, updatedID)
	b, err := scanReview(row)
	if err != nil {
		return nil, fmt.Errorf("error al obtener comentario actualizado: %w", err)
	}

	return b, nil
}

func (s *Service) Delete(ctx context.Context, id string) (bool, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return false, fmt.Errorf("ID inválido: %w", err)
	}

	sql := `DELETE FROM reviews WHERE id = $1`

	tag, err := s.DB.Exec(ctx, sql, dbID)
	if err != nil {
		return false, fmt.Errorf("error al eliminar: %w", err)
	}

	if tag.RowsAffected() == 0 {
		return false, nil
	}

	return true, nil
}
