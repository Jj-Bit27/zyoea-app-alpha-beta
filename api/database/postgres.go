package database

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func poolConfig(databaseURL string, defaultMaxConns int) (*pgxpool.Config, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("error parseando config: %w", err)
	}

	maxConns := defaultMaxConns
	if v := os.Getenv("DB_MAX_CONNS"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed > 0 {
			maxConns = parsed
		}
	}
	cfg.MaxConns = int32(maxConns)

	minConns := 2
	if v := os.Getenv("DB_MIN_CONNS"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil && parsed >= 0 {
			minConns = parsed
		}
	}
	cfg.MinConns = int32(minConns)

	maxConnLifetime := 30 * time.Minute
	if v := os.Getenv("DB_MAX_CONN_LIFETIME"); v != "" {
		if parsed, err := time.ParseDuration(v); err == nil {
			maxConnLifetime = parsed
		}
	}
	cfg.MaxConnLifetime = maxConnLifetime

	maxConnIdleTime := 5 * time.Minute
	if v := os.Getenv("DB_MAX_CONN_IDLE_TIME"); v != "" {
		if parsed, err := time.ParseDuration(v); err == nil {
			maxConnIdleTime = parsed
		}
	}
	cfg.MaxConnIdleTime = maxConnIdleTime

	healthCheckPeriod := 30 * time.Second
	if v := os.Getenv("DB_HEALTH_CHECK_PERIOD"); v != "" {
		if parsed, err := time.ParseDuration(v); err == nil {
			healthCheckPeriod = parsed
		}
	}
	cfg.HealthCheckPeriod = healthCheckPeriod

	return cfg, nil
}

func NewPostgresConnection() (*pgxpool.Pool, error) {
	databaseURL := os.Getenv("DATABASE_URL")

	cfg, err := poolConfig(databaseURL, 25)
	if err != nil {
		return nil, err
	}

	dbPool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		return nil, fmt.Errorf("no se pudo crear el pool de conexión: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := dbPool.Ping(ctx); err != nil {
		return nil, fmt.Errorf("no se pudo hacer ping a la base de datos: %w", err)
	}

	slog.Info("conexión a postgres (write) exitosa",
		"maxConns", cfg.MaxConns,
		"minConns", cfg.MinConns,
		"maxLifetime", cfg.MaxConnLifetime,
	)
	return dbPool, nil
}

func NewPostgresReadConnection() *pgxpool.Pool {
	databaseURL := os.Getenv("DATABASE_READ_URL")
	if databaseURL == "" {
		slog.Info("DATABASE_READ_URL no configurada — usando write pool para lecturas")
		return nil
	}

	cfg, err := poolConfig(databaseURL, 50)
	if err != nil {
		slog.Warn("no se pudo crear read pool", "error", err)
		return nil
	}

	dbPool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		slog.Warn("no se pudo crear read pool", "error", err)
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := dbPool.Ping(ctx); err != nil {
		slog.Warn("no se pudo hacer ping a read replica", "error", err)
		dbPool.Close()
		return nil
	}

	slog.Info("conexión a postgres (read replica) exitosa",
		"maxConns", cfg.MaxConns,
		"minConns", cfg.MinConns,
	)
	return dbPool
}
