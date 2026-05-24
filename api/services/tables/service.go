// internal/tables/service.go
package tables

import (
	"context"
	"errors"
	"fmt"
	"strconv"

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

// ---------------------------------------------------------
// CREAR
// ---------------------------------------------------------
func (s *Service) Create(ctx context.Context, input model.CreateTableInput) (*model.Table, error) {
	var id int
	sql := `
		INSERT INTO tables (restaurant, "number", capacity, "status")
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	err := s.DB.QueryRow(ctx, sql,
		input.Restaurant,
		input.Number,
		input.Capacity,
		input.Status,
	).Scan(&id)

	if err != nil {
		return nil, fmt.Errorf("error al crear la mesa: %w", err)
	}

	return &model.Table{
		ID:           fmt.Sprintf("%d", id),
		RestaurantID: input.Restaurant,
		Number:       input.Number,
		Capacity:     input.Capacity,
		Status:       input.Status,
	}, nil
}

// ---------------------------------------------------------
// OBTENER TODOS
// ---------------------------------------------------------
func (s *Service) FindAllByRestaurant(ctx context.Context, restaurant string) ([]*model.Table, error) {
	dbID, err := strconv.Atoi(restaurant)

	if err != nil {
		return nil, fmt.Errorf("el identificador del restaurante debe ser un número: %w", err)
	}

	sql := `SELECT id, restaurant, booking, "number", capacity, "status" FROM tables WHERE restaurant = $1`

	rows, err := s.DB.Query(ctx, sql, dbID)
	if err != nil {
		return nil, fmt.Errorf("error al consultar mesas: %w", err)
	}
	defer rows.Close()

	var results []*model.Table
	for rows.Next() {
		var b model.Table
		var id, restID int
		var bookingID *int // Usamos un puntero (*int) por si la mesa NO tiene reserva (NULL)

		// 1. Escaneamos usando las variables temporales para las relaciones
		err := rows.Scan(&id, &restID, &bookingID, &b.Number, &b.Capacity, &b.Status)
		if err != nil {
			return nil, err
		}

		// 2. Convertimos el ID de la mesa
		b.ID = fmt.Sprintf("%d", id)

		// 3. Inicializamos el objeto Restaurant manualmente
		b.Restaurant = &model.Restaurant{
			ID: strconv.Itoa(restID),
		}

		// 4. Protegemos el Booking: Solo lo creamos si la base de datos NO devolvió NULL
		if bookingID != nil {
			b.Booking = &model.Booking{
				ID: strconv.Itoa(*bookingID),
			}
		}

		results = append(results, &b)
	}
	return results, nil
}

// ---------------------------------------------------------
// OBTENER UNO EN ESPECÍFICO (GetByID)
// ---------------------------------------------------------
func (s *Service) FindOne(ctx context.Context, id string) (*model.Table, error) {
	// 1. Convertir ID de string (GraphQL) a int (Postgres)
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("el ID debe ser un número: %w", err)
	}

	sql := `SELECT id, restaurant, booking, "number", capacity, "status" FROM tables WHERE id = $1`

	var b model.Table
	var idScanned, restID int
	var bookingID *int

	// 2. Ejecutar Query
	err = s.DB.QueryRow(ctx, sql, dbID).Scan(
		&idScanned,
		&restID,
		&bookingID,
		&b.Number,
		&b.Capacity,
		&b.Status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("mesa con id %s no encontrado", id)
		}
		return nil, err
	}

	b.ID = fmt.Sprintf("%d", idScanned)
	b.Restaurant = &model.Restaurant{
		ID: strconv.Itoa(restID),
	}
	if bookingID != nil {
		b.Booking = &model.Booking{
			ID: strconv.Itoa(*bookingID),
		}
	}

	return &b, nil
}

// ---------------------------------------------------------
// EDITAR (Update)
// ---------------------------------------------------------
func (s *Service) Update(ctx context.Context, id string, input model.UpdateTableInput) (*model.Table, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("ID inválido: %w", err)
	}

	sql := `
		UPDATE tables 
		SET restaurant = $1, "number" = $2, capacity = $3, "status" = $4
		WHERE id = $5
		RETURNING id, restaurant, booking, "number", capacity, "status"
	`

	var b model.Table
	var idScanned, restID int
	var bookingID *int // Puntero por si no hay reserva (NULL)

	// 1. AHORA SÍ PASAMOS LOS 6 PARÁMETROS EN EL ORDEN CORRECTO
	err = s.DB.QueryRow(ctx, sql,
		input.Restaurant, // $1
		input.Number,     // $3
		input.Capacity,   // $4
		input.Status,     // $5
		dbID,             // $6
	).Scan(
		&idScanned,
		&restID,    // Escaneamos a variable temporal
		&bookingID, // Escaneamos a variable temporal
		&b.Number,
		&b.Capacity,
		&b.Status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, errors.New("no se encontró la mesa para actualizar")
		}
		return nil, fmt.Errorf("error al actualizar: %w", err)
	}

	// 2. CONSTRUIMOS LOS OBJETOS GRAPHQL
	b.ID = fmt.Sprintf("%d", idScanned)

	b.Restaurant = &model.Restaurant{
		ID: strconv.Itoa(restID),
	}

	if bookingID != nil {
		b.Booking = &model.Booking{
			ID: strconv.Itoa(*bookingID),
		}
	}

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

	sql := `DELETE FROM tables WHERE id = $1 RETURNING restaurant`

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
