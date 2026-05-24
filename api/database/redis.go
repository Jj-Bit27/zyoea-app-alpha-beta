package database

import (
	"os"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient() *redis.Client {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379" // Fallback para desarrollo local sin docker
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: "", // Vacío si no tienes password
		DB:       0,  // DB por defecto
	})

	return rdb
}
