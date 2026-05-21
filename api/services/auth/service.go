package auth

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"api/graph/model" // Asegúrate que este path coincida con tu go.mod
)

type Service struct {
	DB *pgxpool.Pool
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{DB: db}
}

// Clave secreta (debería venir de .env)
var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

// Regex para validación básica
var emailRegex = regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}$`)

// ----------------------------------------------------------------
// REGISTER
// ----------------------------------------------------------------
func (s *Service) Register(ctx context.Context, input model.RegisterInput) (*model.AuthResponse, error) {
	// A. Validaciones manuales (Reemplazo de class-validator)
	if len(input.Password) < 6 {
		return nil, fmt.Errorf("la contraseña debe tener al menos 6 caracteres")
	}
	if !emailRegex.MatchString(strings.ToLower(input.Email)) {
		return nil, fmt.Errorf("email inválido")
	}

	// B. Verificar si existe
	var exists bool
	s.DB.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email=$1)", input.Email).Scan(&exists)
	if exists {
		return nil, errors.New("este correo ya está en uso")
	}

	// C. Hash Password
	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte(input.Password), 10)

	// D. Token Verificación (6 dígitos)
	nBig, _ := rand.Int(rand.Reader, big.NewInt(900000))
	verificationToken := fmt.Sprintf("%d", 100000+nBig.Int64())
	verificationExp := time.Now().Add(time.Hour)

	// E. Insertar Usuario
	var u model.User
	sql := `
		INSERT INTO users (name, email, password, role, token_verification, token_expiration_verification)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, email, role, is_verified
	`
	err := s.DB.QueryRow(ctx, sql,
		input.Name, input.Email, string(hashedPwd), input.Role, verificationToken, verificationExp,
	).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.IsVerified)

	if err != nil {
		return nil, fmt.Errorf("error DB: %w", err)
	}

	// TODO: Enviar Email (usar goroutine)
	// go sendVerificationEmail(u.Email, verificationToken)
	dbID, err := strconv.Atoi(u.ID)
	if err != nil {
		return nil, fmt.Errorf("error convirtiendo ID de usuario: %w", err)
	}

	// F. Generar JWT
	token, _ := s.generateJWT(dbID, *u.Role, 0)

	return &model.AuthResponse{
		AccessToken: token,
		User:        &u,
	}, nil
}

// ----------------------------------------------------------------
// LOGIN
// ----------------------------------------------------------------
func (s *Service) Login(ctx context.Context, input model.LoginInput) (*model.AuthResponse, error) {
	var u model.User
	var storedHash string

	// A. Buscar Usuario
	sql := `SELECT id, name, email, role, password, is_verified FROM users WHERE email = $1`
	err := s.DB.QueryRow(ctx, sql, input.Email).Scan(
		&u.ID, &u.Name, &u.Email, &u.Role, &storedHash, &u.IsVerified,
	)
	if err == pgx.ErrNoRows {
		return nil, errors.New("no existe esa cuenta")
	}

	// B. Verificar Password
	if err := bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(input.Password)); err != nil {
		return nil, errors.New("la contraseña es incorrecta")
	}

	restID := 0

	// C. Validar Rol y Restaurante
	if u.Role != nil && (*u.Role == "staff" || *u.Role == "admin") {
		s.DB.QueryRow(ctx, "SELECT r.id FROM employees e INNER JOIN restaurants r ON e.restaurant = r.id WHERE e.user = $1", u.ID).Scan(&restID)
	}

	fmt.Println(input)
	fmt.Println(u)
	fmt.Println(restID)

	// D. Generar Token
	dbID, err := strconv.Atoi(u.ID)

	token, _ := s.generateJWT(dbID, *u.Role, restID)

	return &model.AuthResponse{
		AccessToken: token,
		User:        &u,
		Restaurant:  &restID,
	}, nil
}

// ----------------------------------------------------------------
// VERIFY EMAIL
// ----------------------------------------------------------------
func (s *Service) VerifyEmail(ctx context.Context, code string) (*model.User, error) {
	var u model.User
	sql := `
		UPDATE users 
		SET is_verified = true, token_verification = NULL, token_expiration_verification = NULL
		WHERE token_verification = $1
		RETURNING id, name, email, role, is_verified
	`
	err := s.DB.QueryRow(ctx, sql, code).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.IsVerified)
	if err == pgx.ErrNoRows {
		return nil, errors.New("el código es inválido")
	}
	return &u, nil
}

// ----------------------------------------------------------------
// FORGOT PASSWORD
// ----------------------------------------------------------------
func (s *Service) ForgotPassword(ctx context.Context, email string) (bool, error) {
	resetToken := uuid.New().String()
	expiry := time.Now().Add(time.Hour)

	tag, err := s.DB.Exec(ctx,
		"UPDATE users SET reset_token_password=$1, reset_token_expiration_password=$2 WHERE email=$3",
		resetToken, expiry, email)

	if err != nil || tag.RowsAffected() == 0 {
		return false, errors.New("la cuenta no se encontró")
	}
	// go sendRecoveryEmail(...)
	return true, nil
}

// ----------------------------------------------------------------
// RESET PASSWORD
// ----------------------------------------------------------------
func (s *Service) ResetPassword(ctx context.Context, token, password string) (bool, error) {
	hashedPwd, _ := bcrypt.GenerateFromPassword([]byte(password), 10)

	sql := `
		UPDATE users
		SET password = $1, reset_token_password = NULL, reset_token_expiration_password = NULL
		WHERE reset_token_password = $2 AND reset_token_expiration_password > NOW()
	`
	tag, err := s.DB.Exec(ctx, sql, hashedPwd, token)
	if err != nil || tag.RowsAffected() == 0 {
		return false, errors.New("token inválido o expirado")
	}
	return true, nil
}

// ----------------------------------------------------------------
// 6. VERIFY TOKEN (Query)
// ----------------------------------------------------------------
func (s *Service) VerifyToken(ctx context.Context, tokenString string) (*model.UserWithRestaurant, error) {
	// Parsear Token
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) { return jwtSecret, nil })
	if err != nil || !token.Valid {
		return nil, nil
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, nil
	}

	// Extraer ID (asumiendo que sub es int en el token)
	subFloat, _ := claims["sub"].(float64)
	userID := int(subFloat)

	var u model.UserWithRestaurant
	sql := `SELECT id, name, email, role, is_verified FROM users WHERE id = $1`
	err = s.DB.QueryRow(ctx, sql, userID).Scan(&u.ID, &u.Name, &u.Email, &u.Role, &u.IsVerified)
	if err != nil {
		return nil, nil
	}

	// Buscar Restaurante si es empleado
	if u.Role != nil && (*u.Role == "employee" || *u.Role == "administrator") {
		var rID int
		err = s.DB.QueryRow(ctx, "SELECT restaurant_id FROM employees WHERE user_id=$1", userID).Scan(&rID)
		if err == nil {
			u.Restaurant = &rID
		}
	}
	return &u, nil
}

// Helper interno
func (s *Service) generateJWT(userID int, role string, restID int) (string, error) {
	claims := jwt.MapClaims{
		"sub":        userID,
		"role":       role,
		"restaurant": restID,
		"exp":        time.Now().Add(time.Hour * 24).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
}
