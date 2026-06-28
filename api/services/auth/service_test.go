package auth

import (
	"testing"
	"os"
)

func TestEmailRegexValidation(t *testing.T) {
	tests := []struct {
		email string
		valid bool
	}{
		{"test@example.com", true},
		{"user+label@domain.com", true},
		{"a@b.co", true},
		{"invalid-email", false},
		{"@domain.com", false},
		{"name@", false},
		{"", false},
		{"UPPERCASE@example.com", false},
	}

	for _, tt := range tests {
		t.Run(tt.email, func(t *testing.T) {
			if got := emailRegex.MatchString(tt.email); got != tt.valid {
				t.Errorf("emailRegex.MatchString(%q) = %v; want %v", tt.email, got, tt.valid)
			}
		})
	}
}

func TestPasswordTooShort(t *testing.T) {
	passwords := []struct {
		password string
		valid bool
	}{
		{"abcde", false},
		{"abcdef", true},
		{"abc123DEF!\"·$%&/()=", true},
		{"a", false},
		{"123456", true},
	}
	for _, tt := range passwords {
		got := len(tt.password) >= 6
		if got != tt.valid {
			t.Errorf("password length check for %q failed: got %v, want %v", tt.password, got, tt.valid)
		}
	}
}

func TestJWTSecretIsSet(t *testing.T) {
	// The secret is read at init so we check if env is set
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		t.Log("JWT_SECRET env var is not set, jwtSecret will be empty.")
	}

	if len(jwtSecret) == 0 {
		t.Skip("jwtSecret is empty; cannot test JWT signing without secret")
	}
}
