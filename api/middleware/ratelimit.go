package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type RateLimiter struct {
	rdb *redis.Client
	db  *pgxpool.Pool

	// Fallback in-memory cuando Redis no está disponible
	mu        sync.Mutex
	ipCounts  map[string]*counter
	userCounts map[string]*counter
}

type counter struct {
	count   int
	resetAt time.Time
}

func NewRateLimiter(rdb *redis.Client, db *pgxpool.Pool) *RateLimiter {
	rl := &RateLimiter{
		rdb:       rdb,
		db:        db,
		ipCounts:  make(map[string]*counter),
		userCounts: make(map[string]*counter),
	}
	// Limpieza periódica de contadores in-memory cada 5 minutos
	go rl.cleanupLoop()
	return rl
}

func (rl *RateLimiter) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		for k, c := range rl.ipCounts {
			if now.After(c.resetAt) {
				delete(rl.ipCounts, k)
			}
		}
		for k, c := range rl.userCounts {
			if now.After(c.resetAt) {
				delete(rl.userCounts, k)
			}
		}
		rl.mu.Unlock()
	}
}

// Hook para Gin - rechaza si rate limit excedido o IP/USUARIO bloqueado
func (rl *RateLimiter) GinMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Detectar IP real detrás de Cloudflare o proxies
		ip := c.GetHeader("CF-Connecting-IP")
		if ip == "" {
			ip = c.GetHeader("X-Real-Ip")
		}
		if ip == "" {
			ip = c.GetHeader("X-Forwarded-For")
		}
		if ip == "" {
			ip = c.ClientIP()
		}

		userID := c.GetString("user_id")

		allowed, msg := rl.check(c, userID, ip)
		if !allowed {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": msg,
			})
			return
		}
		c.Next()
	}
}

func (rl *RateLimiter) check(c *gin.Context, userID string, ip string) (bool, string) {
	ctx := c.Request.Context()

	if userID != "" {
		if ok, msg := rl.checkUser(ctx, userID); !ok {
			return false, msg
		}
	}

	if ip != "" {
		if ok, msg := rl.checkIP(ctx, ip); !ok {
			return false, msg
		}
	}

	return true, ""
}

func (rl *RateLimiter) checkUser(ctx context.Context, userID string) (bool, string) {
	bloquedKey := "ratelimit:blocked:user:" + userID
	blocked, err := rl.rdb.Get(ctx, bloquedKey).Result()
	if err == nil && blocked != "" {
		return false, "Demasiadas solicitudes. Usuario bloqueado temporalmente."
	}
	if err != nil && err != redis.Nil {
		// Redis no disponible, usar fallback in-memory
		return rl.checkUserMemory(userID)
	}

	key := "ratelimit:user:" + userID
	count, err := rl.rdb.Incr(ctx, key).Result()
	if err != nil {
		return rl.checkUserMemory(userID)
	}
	if count == 1 {
		rl.rdb.Expire(ctx, key, 1*time.Minute)
	}

	if count > 100 {
		violationKey := "ratelimit:violations:user:" + userID
		v, _ := rl.rdb.Incr(ctx, violationKey).Result()
		if v == 1 {
			rl.rdb.Expire(ctx, violationKey, 1*time.Hour)
		}
		if v >= 3 {
			rl.rdb.Set(ctx, bloquedKey, "1", 1*time.Hour)
			rl.rdb.Del(ctx, key)
			return false, "Demasiadas solicitudes. Bloqueado por 1 hora."
		}
		return false, "Límite de solicitudes excedido."
	}

	return true, ""
}

func (rl *RateLimiter) checkUserMemory(userID string) (bool, string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	c, exists := rl.userCounts[userID]
	if !exists || now.After(c.resetAt) {
		rl.userCounts[userID] = &counter{count: 1, resetAt: now.Add(1 * time.Minute)}
		return true, ""
	}

	c.count++
	if c.count > 100 {
		slog.Warn("rate limit excedido (in-memory)", "user", userID)
		return false, "Límite de solicitudes excedido."
	}

	return true, ""
}

func (rl *RateLimiter) checkIP(ctx context.Context, ip string) (bool, string) {
	masked := maskIP(ip)
	banKey := "ratelimit:banned:ip:" + masked

	banned, err := rl.rdb.Get(ctx, banKey).Result()
	if err == nil && banned != "" {
		return false, "IP baneada por actividad sospechosa."
	}
	if err != nil && err != redis.Nil {
		return rl.checkIPMemory(masked)
	}

	key := "ratelimit:ip:" + masked
	count, err := rl.rdb.Incr(ctx, key).Result()
	if err != nil {
		return rl.checkIPMemory(masked)
	}
	if count == 1 {
		rl.rdb.Expire(ctx, key, 1*time.Minute)
	}

	if count > 30 {
		violationKey := "ratelimit:violations:ip:" + masked
		v, _ := rl.rdb.Incr(ctx, violationKey).Result()
		if v == 1 {
			rl.rdb.Expire(ctx, violationKey, 1*time.Hour)
		}
		if v >= 5 {
			rl.rdb.Set(ctx, banKey, "1", 24*time.Hour)
			rl.rdb.Del(ctx, key)
			return false, "IP baneada por 24 horas."
		}
		return false, "Límite de solicitudes excedido."
	}

	return true, ""
}

func (rl *RateLimiter) checkIPMemory(masked string) (bool, string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	c, exists := rl.ipCounts[masked]
	if !exists || now.After(c.resetAt) {
		rl.ipCounts[masked] = &counter{count: 1, resetAt: now.Add(1 * time.Minute)}
		return true, ""
	}

	c.count++
	if c.count > 30 {
		slog.Warn("rate limit excedido (in-memory)", "ip", masked)
		return false, "Límite de solicitudes excedido."
	}

	return true, ""
}

func maskIP(ip string) string {
	parsed := net.ParseIP(ip)
	if parsed == nil || parsed.To4() == nil {
		return ip
	}
	parts := parsed.To4()
	return fmt.Sprintf("%d.%d.%d.0", parts[0], parts[1], parts[2])
}
