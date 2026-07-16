package database

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func NewPostgresConnection() (*pgxpool.Pool, error) {
	databaseURL := os.Getenv("DATABASE_URL")

	dbPool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		return nil, fmt.Errorf("no se pudo crear el pool de conexión: %w", err)
	}

	err = dbPool.Ping(context.Background())
	if err != nil {
		return nil, fmt.Errorf("no se pudo hacer ping a la base de datos: %w", err)
	}

	log.Println("✅ Conexión a Postgres (write) exitosa")
	return dbPool, nil
}

func NewPostgresReadConnection() *pgxpool.Pool {
	databaseURL := os.Getenv("DATABASE_READ_URL")
	if databaseURL == "" {
		log.Println("ℹ️ DATABASE_READ_URL no configurada — usando write pool para lecturas")
		return nil
	}

	dbPool, err := pgxpool.New(context.Background(), databaseURL)
	if err != nil {
		log.Printf("⚠️ No se pudo crear read pool: %v — usando write pool para lecturas", err)
		return nil
	}

	err = dbPool.Ping(context.Background())
	if err != nil {
		log.Printf("⚠️ No se pudo hacer ping a read replica: %v — usando write pool para lecturas", err)
		return nil
	}

	log.Println("✅ Conexión a Postgres (read replica) exitosa")
	return dbPool
}
