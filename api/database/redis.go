package database

import (
	"context"
	"log"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

func NewRedisClient() *redis.Client {
	addr := os.Getenv("REDIS_ADDR")

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
		addr = "localhost:6379"
	}

	password := os.Getenv("REDIS_PASSWORD")

	rdb := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           0,
		DialTimeout:  5 * time.Second,
		ReadTimeout:  3 * time.Second,
		WriteTimeout: 3 * time.Second,
		PoolSize:     10,
		MinIdleConns: 3,
	})

	// Health check inicial con timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️ Redis no disponible en %s: %v — usando fallback in-memory", addr, err)
	} else {
		log.Printf("✅ Redis conectado en %s", addr)
	}

	// Goroutine de health check periódico + reconexión automática
	go redisHealthLoop(rdb, addr, password)

	return rdb
}

func redisHealthLoop(rdb *redis.Client, addr, password string) {
	ticker := time.NewTicker(30 * time.Second)
	backoff := 1 * time.Second
	maxBackoff := 30 * time.Second

	for range ticker.C {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		err := rdb.Ping(ctx).Err()
		cancel()

		if err != nil {
			log.Printf("⚠️ Redis ping falló: %v — reintentando en %v", err, backoff)

			// Intentar reconexión con backoff exponencial
			for i := 0; i < 5; i++ {
				time.Sleep(backoff)

				newRdb := redis.NewClient(&redis.Options{
					Addr:         addr,
					Password:     password,
					DB:           0,
					DialTimeout:  5 * time.Second,
					ReadTimeout:  3 * time.Second,
					WriteTimeout: 3 * time.Second,
					PoolSize:     10,
					MinIdleConns: 3,
				})

				ctx2, cancel2 := context.WithTimeout(context.Background(), 5*time.Second)
				pingErr := newRdb.Ping(ctx2).Err()
				cancel2()

				if pingErr == nil {
					log.Println("✅ Redis reconectado exitosamente")
					*rdb = *newRdb
					backoff = 1 * time.Second
					break
				}

				newRdb.Close()
				backoff = backoff * 2
				if backoff > maxBackoff {
					backoff = maxBackoff
				}
			}
		} else {
			backoff = 1 * time.Second
		}
	}
}
