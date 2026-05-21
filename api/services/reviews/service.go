// internal/reviews/service.go
package reviews

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
	return &Service{DB: db, Redis: rdb}
}

// ---------------------------------------------------------
// CREAR
// ---------------------------------------------------------
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

	return &model.Review{
		ID:           fmt.Sprintf("%d", id),
		RestaurantID: input.Restaurant,
		UserID:       input.User,
		Rating:       input.Rating,
		Comment:      input.Comment,
	}, nil
}

// ---------------------------------------------------------
// OBTENER TODOS
// ---------------------------------------------------------
func (s *Service) FindAllByRestaurant(ctx context.Context, restaurant string) ([]*model.Review, error) {
	dbID, err := strconv.Atoi(restaurant)

	if err != nil {
		return nil, fmt.Errorf("el identificador del restaurante debe ser un número: %w", err)
	}

	key := fmt.Sprintf("reviews:restaurant:%d", dbID)

	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		// Si encontramos datos, los convertimos de JSON a Structs
		var reviews []*model.Review
		if err := json.Unmarshal([]byte(val), &reviews); err == nil {
			fmt.Println("¡Cache Hit! Desde Redis")
			return reviews, nil
		}
	}

	sql := `SELECT id, restaurant, "user", rating, comment FROM reviews WHERE restaurant = $1`

	rows, err := s.DB.Query(ctx, sql, dbID)
	if err != nil {
		return nil, fmt.Errorf("error al consultar comentarios: %w", err)
	}
	defer rows.Close()

	var results []*model.Review
	for rows.Next() {
		var b model.Review
		var id int
		// Escaneamos las columnas en orden
		err := rows.Scan(&id, &b.Restaurant, &b.User, &b.Rating, &b.Comment)
		if err != nil {
			return nil, err
		}
		// Convertimos el ID numérico de la DB al ID string de GraphQL
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
func (s *Service) FindOne(ctx context.Context, id string) (*model.Review, error) {
	// 1. Convertir ID de string (GraphQL) a int (Postgres)
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("el ID debe ser un número: %w", err)
	}

	key := fmt.Sprintf("review:%d", dbID)

	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		// Si encontramos datos, los convertimos de JSON a Structs
		var review *model.Review
		if err := json.Unmarshal([]byte(val), &review); err == nil {
			return review, nil
		}
	}

	sql := `SELECT id, restaurant, "user", rating, comment FROM reviews WHERE id = $1`

	var b model.Review
	var idScanned int

	// 2. Ejecutar Query
	err = s.DB.QueryRow(ctx, sql, dbID).Scan(
		&idScanned,
		&b.Restaurant,
		&b.User,
		&b.Rating,
		&b.Comment,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("comentario con id %s no encontrado", id)
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
func (s *Service) Update(ctx context.Context, id string, input model.UpdateReviewInput) (*model.Review, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("ID inválido: %w", err)
	}

	// Usamos RETURNING para obtener los datos actualizados y confirmar que se hizo
	sql := `
		UPDATE reviews 
		SET restaurant = $1, "user" = $2, rating = $3, comment = $4
		WHERE id = $5
		RETURNING id, restaurant, "user", rating, comment
	`

	var b model.Review
	var idScanned int

	// Asumiendo que el input de update tiene campos opcionales, aquí asumimos que envías todo.
	// Si son opcionales (punteros), necesitarías lógica extra para construir la query dinámicamente.
	err = s.DB.QueryRow(ctx, sql,
		input.Restaurant,
		input.User,
		input.Rating,
		input.Comment,
		dbID, // El ID va al final por el WHERE
	).Scan(&idScanned, &b.Restaurant, &b.User, &b.Rating, &b.Comment)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("no se encontró el comentario para actualizar")
		}
		return nil, fmt.Errorf("error al actualizar: %w", err)
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

	sql := `DELETE FROM reviews WHERE id = $1`

	tag, err := s.DB.Exec(ctx, sql, dbID)
	if err != nil {
		return false, fmt.Errorf("error al eliminar: %w", err)
	}

	// RowsAffected() nos dice cuántas filas se borraron.
	// Si es 0, es que el ID no existía.
	if tag.RowsAffected() == 0 {
		return false, nil // No se borró nada porque no existía
	}

	return true, nil // Se borró con éxito
}
