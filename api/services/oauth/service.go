package oauth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
	"golang.org/x/oauth2/google"

	"api/graph/model"
)

type Service struct {
	DB              *pgxpool.Pool
	GoogleConfig    *oauth2.Config
	FacebookConfig  *oauth2.Config
	TwitterConfig   *oauth2.Config
	OAuthStateStore map[string]time.Time // Para validar estado CSRF
}

// Google OAuth Profile
type GoogleProfile struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

// Facebook OAuth Profile
type FacebookProfile struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name"`
}

// Twitter OAuth Profile
type TwitterProfile struct {
	Data struct {
		ID       string `json:"id"`
		Name     string `json:"name"`
		Username string `json:"username"`
	} `json:"data"`
}

func NewService(db *pgxpool.Pool) *Service {
	return &Service{
		DB:              db,
		GoogleConfig:    getGoogleConfig(),
		FacebookConfig:  getFacebookConfig(),
		TwitterConfig:   getTwitterConfig(),
		OAuthStateStore: make(map[string]time.Time),
	}
}

// ---------------------------------------------------------------
// GOOGLE OAuth
// ---------------------------------------------------------------

func getGoogleConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
}

// ---------------------------------------------------------------
// FACEBOOK OAuth
// ---------------------------------------------------------------

func getFacebookConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("FACEBOOK_CLIENT_ID"),
		ClientSecret: os.Getenv("FACEBOOK_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("FACEBOOK_REDIRECT_URL"),
		Scopes: []string{
			"email",
			"public_profile",
		},
		Endpoint: facebook.Endpoint,
	}
}

// ---------------------------------------------------------------
// TWITTER (X) OAuth 2.0
// ---------------------------------------------------------------

func getTwitterConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("TWITTER_CLIENT_ID"),
		ClientSecret: os.Getenv("TWITTER_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("TWITTER_REDIRECT_URL"),
		Scopes: []string{
			"tweet.read",
			"users.read",
			"offline.access",
		},
		Endpoint: oauth2.Endpoint{
			AuthURL:   "https://twitter.com/i/oauth2/authorize",
			TokenURL:  "https://api.twitter.com/2/oauth2/token",
			AuthStyle: oauth2.AuthStyleInHeader,
		},
	}
}

// ---------------------------------------------------------------
// GENERAR ESTADO PARA OAUTH
// ---------------------------------------------------------------

func (s *Service) GenerateOAuthState() string {
	state := uuid.New().String()
	s.OAuthStateStore[state] = time.Now().Add(10 * time.Minute) // Expira en 10 minutos
	return state
}

// ---------------------------------------------------------------
// VALIDAR ESTADO OAUTH
// ---------------------------------------------------------------

func (s *Service) ValidateOAuthState(state string) bool {
	expiration, exists := s.OAuthStateStore[state]
	if !exists {
		return false
	}

	// Verificar si no ha expirado
	if time.Now().After(expiration) {
		delete(s.OAuthStateStore, state)
		return false
	}

	// Consumir el estado (no puede ser reutilizado)
	delete(s.OAuthStateStore, state)
	return true
}

// ---------------------------------------------------------------
// CALLBACK GOOGLE
// ---------------------------------------------------------------

func (s *Service) HandleGoogleCallback(ctx context.Context, code string) (*model.AuthResponse, error) {
	// Intercambiar código por token
	token, err := s.GoogleConfig.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("error al intercambiar código de Google: %w", err)
	}

	// Obtener información del usuario
	client := s.GoogleConfig.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v1/userinfo?alt=json")
	if err != nil {
		return nil, fmt.Errorf("error al obtener datos de Google: %w", err)
	}
	defer resp.Body.Close()

	var profile GoogleProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("error al decodificar datos de Google: %w", err)
	}

	// Crear o actualizar usuario
	return s.createOrUpdateUser(ctx, profile.Email, profile.Name, "google", profile.ID)
}

// ---------------------------------------------------------------
// CALLBACK FACEBOOK
// ---------------------------------------------------------------

func (s *Service) HandleFacebookCallback(ctx context.Context, code string) (*model.AuthResponse, error) {
	// Intercambiar código por token
	token, err := s.FacebookConfig.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("error al intercambiar código de Facebook: %w", err)
	}

	// Obtener información del usuario
	client := s.FacebookConfig.Client(ctx, token)
	resp, err := client.Get("https://graph.facebook.com/v18.0/me?fields=id,email,name")
	if err != nil {
		return nil, fmt.Errorf("error al obtener datos de Facebook: %w", err)
	}
	defer resp.Body.Close()

	var profile FacebookProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("error al decodificar datos de Facebook: %w", err)
	}

	// Crear o actualizar usuario
	return s.createOrUpdateUser(ctx, profile.Email, profile.Name, "facebook", profile.ID)
}

// ---------------------------------------------------------------
// CALLBACK TWITTER (X)
// ---------------------------------------------------------------

func (s *Service) HandleTwitterCallback(ctx context.Context, code string) (*model.AuthResponse, error) {
	// Intercambiar código por token
	token, err := s.TwitterConfig.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("error al intercambiar código de Twitter: %w", err)
	}

	// Obtener información del usuario
	client := &http.Client{}
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.twitter.com/2/users/me", nil)
	if err != nil {
		return nil, fmt.Errorf("error al crear solicitud a Twitter: %w", err)
	}

	req.Header.Add("Authorization", "Bearer "+token.AccessToken)
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error al obtener datos de Twitter: %w", err)
	}
	defer resp.Body.Close()

	var profile TwitterProfile
	if err := json.NewDecoder(resp.Body).Decode(&profile); err != nil {
		return nil, fmt.Errorf("error al decodificar datos de Twitter: %w", err)
	}

	// Para Twitter, usamos el nombre de usuario como email (con dominio temporal)
	email := profile.Data.Username + "@twitter.local"

	// Crear o actualizar usuario
	return s.createOrUpdateUser(ctx, email, profile.Data.Name, "twitter", profile.Data.ID)
}

// ---------------------------------------------------------------
// CREAR O ACTUALIZAR USUARIO
// ---------------------------------------------------------------

func (s *Service) createOrUpdateUser(ctx context.Context, email string, name string, provider string, providerID string) (*model.AuthResponse, error) {
	// Buscar usuario existente
	var u model.User
	sql := `
		SELECT id, name, email, role, is_verified
		FROM users
		WHERE email = $1
		LIMIT 1
	`

	err := s.DB.QueryRow(ctx, sql, email).Scan(
		&u.ID, &u.Name, &u.Email, &u.Role, &u.IsVerified,
	)

	if err == pgx.ErrNoRows {
		// Crear nuevo usuario con OAuth
		sql := `
			INSERT INTO users (name, email, role, is_verified)
			VALUES ($1, $2, $3, true)
			RETURNING id, name, email, role, is_verified
		`
		err := s.DB.QueryRow(ctx, sql, name, email, "client").Scan(
			&u.ID, &u.Name, &u.Email, &u.Role, &u.IsVerified,
		)

		if err != nil {
			return nil, fmt.Errorf("error al crear usuario OAuth: %w", err)
		}
	} else if err != nil {
		return nil, fmt.Errorf("error al buscar usuario: %w", err)
	} else {
		// Actualizar nombre si es diferente
		if name != "" && (u.Name == nil || *u.Name != name) {
			sql := `
				UPDATE users
				SET name = $1, updated_at = NOW()
				WHERE id = $2
			`
			_, err := s.DB.Exec(ctx, sql, name, u.ID)
			if err != nil {
				return nil, fmt.Errorf("error al actualizar usuario: %w", err)
			}
			u.Name = &name
		}
	}

	// Generar JWT
	dbID, err := strconv.Atoi(u.ID)
	if err != nil {
		return nil, fmt.Errorf("error convirtiendo ID de usuario: %w", err)
	}

	role := "user"
	if u.Role != nil {
		role = *u.Role
	}

	// Buscar restaurant asociado si es staff o admin
	var restID int
	if u.Role != nil && (*u.Role == "staff" || *u.Role == "admin") {
		err := s.DB.QueryRow(ctx,
			"SELECT r.id FROM employees e INNER JOIN restaurants r ON e.restaurant = r.id WHERE e.\"user\" = $1",
			u.ID,
		).Scan(&restID)
		if err != nil && err != pgx.ErrNoRows {
			slog.Warn("Error buscando restaurant del empleado (OAuth)", "error", err)
		}
	}

	token, err := s.generateJWT(dbID, role, restID)
	if err != nil {
		return nil, fmt.Errorf("error generando JWT: %w", err)
	}

	return &model.AuthResponse{
		AccessToken: token,
		User:        &u,
		Restaurant:  &restID,
	}, nil
}

// ---------------------------------------------------------------
// GENERAR JWT
// ---------------------------------------------------------------

func (s *Service) generateJWT(userID int, role string, restID int) (string, error) {
	jwtSecret := []byte(os.Getenv("JWT_SECRET"))
	if len(jwtSecret) == 0 {
		return "", errors.New("JWT_SECRET no está configurado")
	}

	claims := jwt.MapClaims{
		"sub":        userID,
		"role":       role,
		"restaurant": restID,
		"exp":        time.Now().Add(24 * time.Hour).Unix(),
		"iat":        time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// ---------------------------------------------------------------
// OBTENER URL DE AUTORIZACIÓN
// ---------------------------------------------------------------

func (s *Service) GetGoogleAuthURL() (string, string) {
	state := s.GenerateOAuthState()
	return s.GoogleConfig.AuthCodeURL(state, oauth2.AccessTypeOffline), state
}

func (s *Service) GetFacebookAuthURL() (string, string) {
	state := s.GenerateOAuthState()
	return s.FacebookConfig.AuthCodeURL(state), state
}

func (s *Service) GetTwitterAuthURL() (string, string) {
	state := s.GenerateOAuthState()
	return s.TwitterConfig.AuthCodeURL(state, oauth2.AccessTypeOffline), state
}
