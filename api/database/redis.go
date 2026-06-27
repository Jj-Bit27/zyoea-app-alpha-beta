package database

import (
	"net/url"
	"os"
	"strings"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient() *redis.Client {
	addr := os.Getenv("REDIS_ADDR")

	// Si no está REDIS_ADDR, intentar con REDIS_URL (formato redis://user:pass@host:port/db)
	if addr == "" {
		if redisURL := os.Getenv("REDIS_URL"); redisURL != "" {
			if u, err := url.Parse(redisURL); err == nil {
				host := u.Host
				if !strings.Contains(host, ":") {
					host = host + ":6379"
				}
				addr = host
			}
		}
	}

	if addr == "" {
		addr = "localhost:6379" // Fallback para desarrollo local sin docker
	}

	password := os.Getenv("REDIS_PASSWORD")

	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password, // Vacío si no tienes password
		DB:       0,        // DB por defecto
	})

	return rdb
}
