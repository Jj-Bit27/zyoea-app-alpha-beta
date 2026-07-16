package database

import (
	"os"
	"testing"
)

func TestPoolConfigDefaults(t *testing.T) {
	os.Unsetenv("DB_MAX_CONNS")
	os.Unsetenv("DB_MIN_CONNS")
	os.Unsetenv("DB_MAX_CONN_LIFETIME")

	cfg, err := poolConfig("postgres://user:pass@localhost:5432/test?sslmode=disable", 25)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.MaxConns != 25 {
		t.Errorf("expected MaxConns=25, got %d", cfg.MaxConns)
	}

	if cfg.MinConns != 2 {
		t.Errorf("expected MinConns=2, got %d", cfg.MinConns)
	}

	if cfg.ConnConfig.Host != "localhost" {
		t.Errorf("expected host localhost, got %s", cfg.ConnConfig.Host)
	}
}

func TestPoolConfigEnvOverride(t *testing.T) {
	os.Setenv("DB_MAX_CONNS", "50")
	os.Setenv("DB_MIN_CONNS", "5")
	defer func() {
		os.Unsetenv("DB_MAX_CONNS")
		os.Unsetenv("DB_MIN_CONNS")
	}()

	cfg, err := poolConfig("postgres://user:pass@localhost:5432/test?sslmode=disable", 25)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.MaxConns != 50 {
		t.Errorf("expected MaxConns=50 from env, got %d", cfg.MaxConns)
	}

	if cfg.MinConns != 5 {
		t.Errorf("expected MinConns=5 from env, got %d", cfg.MinConns)
	}
}

func TestPoolConfigInvalidURL(t *testing.T) {
	_, err := poolConfig("not-a-valid-url", 25)
	if err == nil {
		t.Error("expected error for invalid URL")
	}
}

func TestPoolConfigInvalidEnvValues(t *testing.T) {
	os.Setenv("DB_MAX_CONNS", "invalid")
	defer os.Unsetenv("DB_MAX_CONNS")

	cfg, err := poolConfig("postgres://user:pass@localhost:5432/test?sslmode=disable", 25)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if cfg.MaxConns != 25 {
		t.Errorf("expected MaxConns=25 (default when env invalid), got %d", cfg.MaxConns)
	}
}
