package middleware

import (
	"github.com/gin-gonic/gin"
)

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "0")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

		c.Header("Content-Security-Policy", ""+
			"default-src 'self'; "+
			"script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; "+
			"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "+
			"img-src 'self' data: blob: https://res.cloudinary.com https://*.stripe.com; "+
			"font-src 'self' https://fonts.gstatic.com; "+
			"frame-src https://js.stripe.com https://hooks.stripe.com; "+
			"connect-src 'self' ws: wss: https://api.stripe.com; "+
			"media-src 'self'; "+
			"object-src 'none'; "+
			"base-uri 'self'; "+
			"form-action 'self'; "+
			"upgrade-insecure-requests;",
		)

		c.Header("Permissions-Policy", ""+
			"camera=(), "+
			"microphone=(), "+
			"geolocation=(), "+
			"payment=(self), "+
			"display-capture=()",
		)

		c.Next()
	}
}
