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

// ---------------------------------------------------------
// 1. FIND ALL BY RESTAURANT
// ---------------------------------------------------------
func (s *Service) FindAllByRestaurant(ctx context.Context, restaurantID string) ([]*model.Employee, error) {
	// Consulta directa a la base de datos
	sql := `
		SELECT e.id, r.id, u.id, u."name", u."role", u."email", e.position, e.hire_date
		FROM employees e
		INNER JOIN users u ON e.user = u.id
		INNER JOIN restaurants r ON e.restaurant = r.id
		WHERE e.restaurant = $1
	`
	rows, err := s.DB.Query(ctx, sql, restaurantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var employees []*model.Employee
	for rows.Next() {
		var e model.Employee
		var r model.Restaurant
		var u model.User
		var id int // 1. Nuestras variables salvavidas

		// 2. Escaneamos hacia las variables temporales en lugar de los punteros nulos
		// (Nota: puse "user" y "position" entre comillas por si Postgres los toma como palabras reservadas)
		if err := rows.Scan(&id, &r.ID, &u.ID, &u.Name, &u.Role, &u.Email, &e.Position, &e.HireDate); err != nil {
			return nil, err
		}

		e.ID = fmt.Sprintf("%d", id)

		e.Restaurant = &r
		e.User = &u
		employees = append(employees, &e)
	}

	return employees, nil
}

// ---------------------------------------------------------
// 2. CREATE (Transacción: Usuario + Empleado)
// ---------------------------------------------------------
func (s *Service) Create(ctx context.Context, input model.CreateEmployeeInput) (*model.Employee, error) {
	// A. Hashear Password
	hashedPwd, err := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
	if err != nil {
		return nil, err
	}

	// B. Iniciar Transacción SQL
	tx, err := s.DB.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx) // Seguridad: Si algo falla, deshacer todo

	// C. Crear Usuario
	var userID int
	sqlUser := `
		INSERT INTO users ("name", email, "password", "role", is_verified)
		VALUES ($1, $2, $3, $4, true)
		RETURNING id
	`
	// Usamos input.Puesto como Rol inicial
	err = tx.QueryRow(ctx, sqlUser, input.Name, input.Email, string(hashedPwd), &input.Role).Scan(&userID)
	if err != nil {
		return nil, fmt.Errorf("error creando usuario: %w", err)
	}

	// D. Crear Empleado
	var emp model.Employee
	var empID, restID, usrID int // 1. Variables temporales para los IDs

	sqlEmp := `
		INSERT INTO employees ("user", restaurant, "position", hire_date)
		VALUES ($1, $2, $3, $4)
		RETURNING id, restaurant, "user", "position", hire_date
	`

	// 2. Quitamos los "&" de los parámetros de entrada (excepto time.Now)
	// y escaneamos los IDs en nuestras variables temporales
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

	// 3. Inicializamos los objetos anidados de GraphQL de forma segura
	emp.ID = fmt.Sprintf("%d", empID)
	emp.Restaurant = &model.Restaurant{ID: fmt.Sprintf("%d", restID)}
	emp.User = &model.User{ID: fmt.Sprintf("%d", usrID)}

	// E. Commit Transacción (Guardar cambios permanentemente)
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &emp, nil
}

// ---------------------------------------------------------
// 3. UPDATE (Transacción)
// ---------------------------------------------------------
func (s *Service) Update(ctx context.Context, input model.UpdateEmployeeInput) (*model.Employee, error) {
	// Primero buscamos el empleado para obtener su usuario_id
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

	// A. Actualizar Usuario (Si enviaron datos de usuario)
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

	// B. Actualizar Empleado (Si enviaron datos de empleado)
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

	// Retornamos el empleado actualizado
	return &e, nil
}

// ---------------------------------------------------------
// 4. REMOVE (Transacción: Borrar Empleado -> Borrar Usuario)
// ---------------------------------------------------------
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

	// A. Borrar Empleado
	if _, err := tx.Exec(ctx, "DELETE FROM employees WHERE id=$1", id); err != nil {
		return false, err
	}

	// B. Borrar Usuario
	if _, err := tx.Exec(ctx, "DELETE FROM users WHERE id=$1", userID); err != nil {
		return false, err
	}

	if err := tx.Commit(ctx); err != nil {
		return false, err
	}

	return true, nil
}

// ---------------------------------------------------------
// HELPER: FIND ONE
// ---------------------------------------------------------
func (s *Service) FindOne(ctx context.Context, id string) (*model.Employee, error) {
	// 1. Hacemos el JOIN con las tablas users y restaurants
	// Asegúrate de que los nombres de las columnas coincidan con tu base de datos
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
	// 2. Creamos variables temporales para los datos que vienen de Postgres
	var empID, userID, restID int
	var userName, userEmail, userRole *string
	var restName string

	// 3. Ejecutamos la consulta y escaneamos TODO en el orden exacto del SELECT
	err := s.DB.QueryRow(ctx, sql, id).Scan(
		&empID, &e.Position, &e.HireDate, // Datos del empleado
		&userID, &userName, &userEmail, &userRole, // Datos del usuario
		&restID, &restName, // Datos del restaurante
	)

	if err != nil {
		return nil, fmt.Errorf("error al buscar empleado: %w", err)
	}

	// 4. Construimos el objeto GraphQL principal
	e.ID = fmt.Sprintf("%d", empID)

	// 5. Construimos los objetos anidados con toda su información
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
