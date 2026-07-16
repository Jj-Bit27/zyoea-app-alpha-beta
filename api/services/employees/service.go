package employees

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"api/graph/model"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	DB *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{DB: db}
}

const employeeListSelect = `SELECT e.id, r.id, u.id, u."name", u."role", u."email", e.position, e.hire_date`

const employeeListFrom = `FROM employees e
	INNER JOIN users u ON e.user = u.id
	INNER JOIN restaurants r ON e.restaurant = r.id`

func scanEmployee(scanner interface {
	Scan(dest ...interface{}) error
}) (*model.Employee, error) {
	var e model.Employee
	var r model.Restaurant
	var u model.User
	var id int

	if err := scanner.Scan(&id, &r.ID, &u.ID, &u.Name, &u.Role, &u.Email, &e.Position, &e.HireDate); err != nil {
		return nil, err
	}

	e.ID = fmt.Sprintf("%d", id)
	e.Restaurant = &r
	e.User = &u
	return &e, nil
}

func (s *Service) FindAllByRestaurant(ctx context.Context, restaurantID string, limit int, offset int) ([]*model.Employee, error) {
	sql := employeeListSelect + ` ` + employeeListFrom + ` WHERE e.restaurant = $1 ORDER BY e.id LIMIT $2 OFFSET $3`

	rows, err := s.DB.Query(ctx, sql, restaurantID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var employees []*model.Employee
	for rows.Next() {
		e, err := scanEmployee(rows)
		if err != nil {
			return nil, err
		}
		employees = append(employees, e)
	}

	return employees, nil
}

func (s *Service) Create(ctx context.Context, input model.CreateEmployeeInput) (*model.Employee, error) {
	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
	if err != nil {
		return nil, err
	}

	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var userID int
	sqlUser := `
		INSERT INTO users ("name", email, "password", "role", is_verified)
		VALUES ($1, $2, $3, $4, true)
		RETURNING id
	`
	err = tx.QueryRow(ctx, sqlUser, input.Name, input.Email, string(hashedPwd), &input.Role).Scan(&userID)
	if err != nil {
		return nil, fmt.Errorf("error creando usuario: %w", err)
	}

	var emp model.Employee
	var empID, restID, usrID int

	sqlEmp := `
		INSERT INTO employees ("user", restaurant, "position", hire_date)
		VALUES ($1, $2, $3, $4)
		RETURNING id, restaurant, "user", "position", hire_date
	`

	err = tx.QueryRow(ctx, sqlEmp, userID, input.RestaurantID, input.Position, time.Now()).Scan(
		&empID,
		&restID,
		&usrID,
		&emp.Position,
		&emp.HireDate,
	)

	if err != nil {
		return nil, fmt.Errorf("error creando empleado: %w", err)
	}

	emp.ID = fmt.Sprintf("%d", empID)
	emp.Restaurant = &model.Restaurant{ID: fmt.Sprintf("%d", restID)}
	emp.User = &model.User{ID: fmt.Sprintf("%d", usrID)}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &emp, nil
}

func (s *Service) Update(ctx context.Context, input model.UpdateEmployeeInput) (*model.Employee, error) {
	empID, err := strconv.Atoi(input.ID)
	if err != nil {
		return nil, fmt.Errorf("ID de empleado inválido: %w", err)
	}

	var restID, userID int
	err = s.DB.QueryRow(ctx, `SELECT restaurant, "user" FROM employees WHERE id=$1`, empID).Scan(
		&restID, &userID,
	)
	if err == pgx.ErrNoRows {
		return nil, errors.New("empleado no encontrado")
	}

	var u model.User
	var e model.Employee

	if input.Name != nil || input.Email != nil {
		sqlUser := `
			UPDATE users SET
				name = $1,
				email = $2
			WHERE id = $3
			RETURNING id, name, email
		`
		err = s.DB.QueryRow(ctx, sqlUser, input.Name, input.Email, userID).Scan(&userID, &u.Name, &u.Email)
		if err != nil {
			return nil, fmt.Errorf("error actualizando usuario: %w", err)
		}
	}

	if input.RestaurantID != nil || input.Position != nil {
		sqlEmp := `
			UPDATE employees SET
				restaurant = $1,
				position = $2
			WHERE id = $3
			RETURNING restaurant, position
		`
		err = s.DB.QueryRow(ctx, sqlEmp, input.RestaurantID, input.Position, input.ID).Scan(&e.RestaurantID, &e.Position)
		if err != nil {
			return nil, fmt.Errorf("error actualizando empleado: %w", err)
		}
	}

	e.User = &u
	return &e, nil
}

func (s *Service) Delete(ctx context.Context, id string) (bool, error) {
	var userID int
	err := s.DB.QueryRow(ctx, `SELECT "user" FROM employees WHERE id=$1`, id).Scan(&userID)
	if err != nil {
		return false, errors.New("empleado no encontrado")
	}

	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, "DELETE FROM employees WHERE id=$1", id); err != nil {
		return false, err
	}

	if _, err := tx.Exec(ctx, "DELETE FROM users WHERE id=$1", userID); err != nil {
		return false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}

	return true, nil
}

func (s *Service) FindOne(ctx context.Context, id string) (*model.Employee, error) {
	sql := `
		SELECT 
			e.id, e."position", e.hire_date,
			u.id, u."name", u.email, u."role",
			r.id, r."name"
		FROM employees e
		INNER JOIN users u ON e."user" = u.id
		INNER JOIN restaurants r ON e.restaurant = r.id
		WHERE e.id = $1
	`

	var e model.Employee
	var empID, userID, restID int
	var userName, userEmail, userRole *string
	var restName string

	err := s.DB.QueryRow(ctx, sql, id).Scan(
		&empID, &e.Position, &e.HireDate,
		&userID, &userName, &userEmail, &userRole,
		&restID, &restName,
	)

	if err != nil {
		return nil, fmt.Errorf("error al buscar empleado: %w", err)
	}

	e.ID = fmt.Sprintf("%d", empID)

	e.User = &model.User{
		ID:    fmt.Sprintf("%d", userID),
		Name:  userName,
		Email: userEmail,
		Role:  userRole,
	}

	e.Restaurant = &model.Restaurant{
		ID:   fmt.Sprintf("%d", restID),
		Name: restName,
	}

	return &e, nil
}
