package database

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPostgresConnection inicializa y devuelve el pool de conexiones
func NewPostgresConnection() (*pgxpool.Pool, error) {
	// Reemplaza con tus credenciales reales
	databaseURL := "postgres://user:password@localhost:32768/db"

	dbPool, err := pgxpool.New(context.Background(), databaseURL)

	if err != nil {
		return nil, fmt.Errorf("no se pudo crear el pool de conexión: %w", err)
	}

	// Verificar que la conexión está viva
	err = dbPool.Ping(context.Background())

	if err != nil {
		return nil, fmt.Errorf("no se pudo hacer ping a la base de datos: %w", err)
	}

	log.Println("✅ Conexión a Postgres exitosa")
	return dbPool, nil
}
