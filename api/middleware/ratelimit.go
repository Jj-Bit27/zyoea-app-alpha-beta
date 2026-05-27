package middleware

import (
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type RateLimiter struct {
	rdb *redis.Client
	db  *pgxpool.Pool
}

func NewRateLimiter(rdb *redis.Client, db *pgxpool.Pool) *RateLimiter {
	return &RateLimiter{rdb: rdb, db: db}
}

// Hook para Gin - rechaza si rate limit excedido o IP/USUARIO bloqueado
func (rl *RateLimiter) GinMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
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
		blocked, _ := rl.rdb.Get(ctx, "ratelimit:blocked:user:"+userID).Result()
		if blocked != "" {
			return false, "Demasiadas solicitudes. Usuario bloqueado temporalmente."
		}

		key := "ratelimit:user:" + userID
		count, _ := rl.rdb.Incr(ctx, key).Result()
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
				rl.rdb.Set(ctx, "ratelimit:blocked:user:"+userID, "1", 1*time.Hour)
				rl.rdb.Del(ctx, key)
				return false, "Demasiadas solicitudes. Bloqueado por 1 hora."
			}
			return false, "Límite de solicitudes excedido."
		}
	}

	if ip != "" {
		banned, _ := rl.rdb.Get(ctx, "ratelimit:banned:ip:"+maskIP(ip)).Result()
		if banned != "" {
			return false, "IP baneada por actividad sospechosa."
		}

		key := "ratelimit:ip:" + maskIP(ip)
		count, _ := rl.rdb.Incr(ctx, key).Result()
		if count == 1 {
			rl.rdb.Expire(ctx, key, 1*time.Minute)
		}

		if count > 30 {
			violationKey := "ratelimit:violations:ip:" + maskIP(ip)
			v, _ := rl.rdb.Incr(ctx, violationKey).Result()
			if v == 1 {
				rl.rdb.Expire(ctx, violationKey, 1*time.Hour)
			}
			if v >= 5 {
				rl.rdb.Set(ctx, "ratelimit:banned:ip:"+maskIP(ip), "1", 24*time.Hour)
				rl.rdb.Del(ctx, key)
				return false, "IP baneada por 24 horas."
			}
			return false, "Límite de solicitudes excedido."
		}
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
