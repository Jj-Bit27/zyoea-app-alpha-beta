package bookings

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strconv"
	"strings"
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

const bookingJoinSelect = `SELECT 
	b.id, b.restaurant, b."user", b."table", b.people, b."time", b.status, b.cancellation_reason,
	r.id, r."name", r.address, r.email,
	u.id, u."name", u.email, u."role"`

const bookingJoinFrom = `FROM bookings b
	INNER JOIN restaurants r ON b.restaurant = r.id
	INNER JOIN users u ON b."user" = u.id`

func scanBookingWithJoins(scanner interface {
	Scan(dest ...interface{}) error
}) (*model.Booking, error) {
	var b model.Booking
	var r model.Restaurant
	var u model.User

	err := scanner.Scan(
		&b.ID, &b.RestaurantID, &b.UserID, &b.TableID, &b.People, &b.Time, &b.Status, &b.CancellationReason,
		&r.ID, &r.Name, &r.Address, &r.Email,
		&u.ID, &u.Name, &u.Email, &u.Role,
	)
	if err != nil {
		return nil, err
	}

	b.Restaurant = &r
	b.User = &u
	return &b, nil
}

func (s *Service) autoExpirePastBookings(ctx context.Context) error {
	sql := `UPDATE bookings SET status = 'cancelled' WHERE status = 'pending' AND "time" < NOW()`
	_, err := s.DB.Exec(ctx, sql)
	return err
}

func (s *Service) Create(ctx context.Context, input model.CreateBookingInput) (*model.Booking, error) {
	var id int
	sql := `
		INSERT INTO bookings (restaurant, "user", "table", people, "time", status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id
	`

	err := s.DB.QueryRow(ctx, sql,
		input.Restaurant,
		input.User,
		input.Table,
		input.People,
		input.Time,
		input.Status,
	).Scan(&id)

	if err != nil {
		return nil, fmt.Errorf("error al crear reserva: %w", err)
	}

	var b model.Booking
	b.ID = fmt.Sprintf("%d", id)
	b.RestaurantID = input.Restaurant
	b.UserID = input.User
	b.TableID = input.Table
	b.People = input.People
	b.Time = input.Time
	b.Status = input.Status

	cacheKeyRestaurant := fmt.Sprintf("bookings:restaurant:%d", b.RestaurantID)
	cacheKeyUser := fmt.Sprintf("bookings:user:%d", b.UserID)
	cacheKeyBooking := fmt.Sprintf("bookings:%d", id)

	_, err = s.Redis.Get(ctx, cacheKeyRestaurant).Result()
	if err == nil {
		s.Redis.Del(ctx, cacheKeyRestaurant, cacheKeyUser, cacheKeyBooking)
	}

	return &b, nil
}

func (s *Service) FindAllByRestaurant(ctx context.Context, restaurant string, limit int, offset int) ([]*model.Booking, error) {
	dbID, err := strconv.Atoi(restaurant)
	if err != nil {
		return nil, fmt.Errorf("el identificador del restaurante debe ser un número: %w", err)
	}

	key := fmt.Sprintf("bookings:restaurant:%d:%d:%d", dbID, limit, offset)

	s.autoExpirePastBookings(ctx)

	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		var bookings []*model.Booking
		if err := json.Unmarshal([]byte(val), &bookings); err == nil {
			slog.Debug("Cache hit", "key", key)
			return bookings, nil
		}
	}

	sql := bookingJoinSelect + ` ` + bookingJoinFrom + ` WHERE b.restaurant = $1 ORDER BY b."time" DESC LIMIT $2 OFFSET $3`

	rows, err := s.readDB().Query(ctx, sql, dbID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("error al consultar reservas: %w", err)
	}
	defer rows.Close()

	var results []*model.Booking
	for rows.Next() {
		b, err := scanBookingWithJoins(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, b)
	}

	data, _ := json.Marshal(results)
	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return results, nil
}

func (s *Service) FindAllByUser(ctx context.Context, user string, limit int, offset int) ([]*model.Booking, error) {
	dbID, err := strconv.Atoi(user)
	if err != nil {
		return nil, fmt.Errorf("el identificador del usuario debe ser un número: %w", err)
	}

	key := fmt.Sprintf("bookings:user:%d:%d:%d", dbID, limit, offset)

	s.autoExpirePastBookings(ctx)

	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		var bookings []*model.Booking
		if err := json.Unmarshal([]byte(val), &bookings); err == nil {
			slog.Debug("Cache hit", "key", key)
			return bookings, nil
		}
	}

	sql := bookingJoinSelect + ` ` + bookingJoinFrom + ` WHERE b."user" = $1 ORDER BY b."time" DESC LIMIT $2 OFFSET $3`

	rows, err := s.readDB().Query(ctx, sql, dbID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("error al consultar reservas: %w", err)
	}
	defer rows.Close()

	var results []*model.Booking
	for rows.Next() {
		b, err := scanBookingWithJoins(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, b)
	}

	data, _ := json.Marshal(results)
	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return results, nil
}

func (s *Service) FindOne(ctx context.Context, id string) (*model.Booking, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("el ID debe ser un número: %w", err)
	}

	key := fmt.Sprintf("booking:%d", dbID)

	val, err := s.Redis.Get(ctx, key).Result()
	if err == nil {
		var booking *model.Booking
		if err := json.Unmarshal([]byte(val), &booking); err == nil {
			return booking, nil
		}
	}

	sql := `SELECT id, restaurant, "user", "table", people, "time", status, cancellation_reason FROM bookings WHERE id = $1`

	var b model.Booking
	var idScanned, restID, userID int

	err = s.readDB().QueryRow(ctx, sql, dbID).Scan(
		&idScanned,
		&restID,
		&userID,
		&b.TableID,
		&b.People,
		&b.Time,
		&b.Status,
		&b.CancellationReason,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("reserva con id %s no encontrada", id)
		}
		return nil, err
	}

	b.ID = fmt.Sprintf("%d", idScanned)
	b.RestaurantID = restID
	b.UserID = userID
	data, _ := json.Marshal(&b)

	s.Redis.Set(ctx, key, data, 10*time.Minute)
	return &b, nil
}

func (s *Service) Update(ctx context.Context, id string, input model.UpdateBookingInput) (*model.Booking, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return nil, fmt.Errorf("ID inválido: %w", err)
	}

	sets := []string{}
	args := []interface{}{}
	argIdx := 1

	if input.Restaurant != nil {
		sets = append(sets, fmt.Sprintf(`restaurant = $%d`, argIdx))
		args = append(args, *input.Restaurant)
		argIdx++
	}
	if input.User != nil {
		sets = append(sets, fmt.Sprintf(`"user" = $%d`, argIdx))
		args = append(args, *input.User)
		argIdx++
	}
	if input.Table != nil {
		sets = append(sets, fmt.Sprintf(`"table" = $%d`, argIdx))
		args = append(args, *input.Table)
		argIdx++
	}
	if input.People != nil {
		sets = append(sets, fmt.Sprintf(`people = $%d`, argIdx))
		args = append(args, *input.People)
		argIdx++
	}
	if input.Time != nil {
		sets = append(sets, fmt.Sprintf(`"time" = $%d`, argIdx))
		args = append(args, *input.Time)
		argIdx++
	}
	if input.Status != nil {
		sets = append(sets, fmt.Sprintf(`status = $%d`, argIdx))
		args = append(args, *input.Status)
		argIdx++
	}
	if input.CancellationReason != nil {
		sets = append(sets, fmt.Sprintf(`cancellation_reason = $%d`, argIdx))
		args = append(args, *input.CancellationReason)
		argIdx++
	}

	if len(sets) == 0 {
		return s.FindOne(ctx, id)
	}

	sql := fmt.Sprintf(`UPDATE bookings SET %s WHERE id = $%d`, strings.Join(sets, ", "), argIdx)
	args = append(args, dbID)

	_, err = s.DB.Exec(ctx, sql, args...)
	if err != nil {
		return nil, fmt.Errorf("error al actualizar reserva: %w", err)
	}

	// Invalidate cache
	existing, err := s.FindOne(ctx, id)
	if err != nil {
		return nil, err
	}

	if input.Restaurant != nil {
		cacheKey := fmt.Sprintf("bookings:restaurant:%d", *input.Restaurant)
		s.Redis.Del(ctx, cacheKey)
	}
	if input.User != nil {
		cacheKeyUser := fmt.Sprintf("bookings:user:%d", *input.User)
		s.Redis.Del(ctx, cacheKeyUser)
	}
	s.Redis.Del(ctx, fmt.Sprintf("booking:%d", dbID))

	return existing, nil
}

func (s *Service) Delete(ctx context.Context, id string) (bool, error) {
	dbID, err := strconv.Atoi(id)
	if err != nil {
		return false, fmt.Errorf("ID inválido: %w", err)
	}

	sql := `DELETE FROM bookings WHERE id = $1 RETURNING restaurant, "user"`

	var restaurantID, userID int
	err = s.DB.QueryRow(ctx, sql, dbID).Scan(&restaurantID, &userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return false, nil
		}
		return false, fmt.Errorf("error al eliminar la reserva: %w", err)
	}

	cacheKey := fmt.Sprintf("bookings:restaurant:%d", restaurantID)
	cacheKeyUser := fmt.Sprintf("bookings:user:%d", userID)
	cacheKeyBooking := fmt.Sprintf("bookings:%d", dbID)

	s.Redis.Del(ctx, cacheKey, cacheKeyUser, cacheKeyBooking)

	return true, nil
}
