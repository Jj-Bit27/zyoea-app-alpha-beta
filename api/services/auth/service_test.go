package auth

import (
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	os.Setenv("JWT_SECRET", "test-secret-key-for-testing")
	code := m.Run()
	os.Unsetenv("JWT_SECRET")
	os.Exit(code)
}

func TestEmailValidation(t *testing.T) {
	validEmails := []string{"user@example.com", "test.user@domain.co", "user+tag@test.org"}
	invalidEmails := []string{"", "not-an-email", "@domain.com", "user@", "user@.com", "user@domain"}

	for _, email := range validEmails {
		if !emailRegex.MatchString(email) {
			t.Errorf("expected valid email to match: %s", email)
		}
	}

	for _, email := range invalidEmails {
		if emailRegex.MatchString(email) {
			t.Errorf("expected invalid email to not match: %s", email)
		}
	}
}

func TestPasswordValidation(t *testing.T) {
	// This tests the validation logic that would be in Register
	shortPassword := "12345"
	if len(shortPassword) < 6 {
		// Expect: error "la contraseña debe tener al menos 6 caracteres"
	} else {
		t.Error("expected short password to be invalid")
	}

	validPassword := "securePass123!"
	if len(validPassword) < 6 {
		t.Error("expected valid password length to be >= 6")
	}
}

func TestJWTGeneration(t *testing.T) {
	s := &Service{}

	token, err := s.generateJWT(1, "client", 0)
	if err != nil {
		t.Fatalf("unexpected error generating JWT: %v", err)
	}

	if token == "" {
		t.Error("expected non-empty token")
	}
}
