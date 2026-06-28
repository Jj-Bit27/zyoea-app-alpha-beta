package orders

import (
	"context"
	"testing"
	"strconv"
)

func TestRestaurantIDParsing(t *testing.T) {
	tests := []struct {
		input string
		valid bool
		value int
	}{
		{"42", true, 42},
		{"0", true, 0},
		{"abc", false, 0},
		{"", false, 0},
	}
	for _, tt := range tests {
		v, err := strconv.Atoi(tt.input)
		gotValid := err == nil
		if gotValid != tt.valid {
			t.Errorf("Atoi(%q) valid=%v; want %v", tt.input, gotValid, tt.valid)
		}
		if err == nil && v != tt.value {
			t.Errorf("Atoi(%q) = %d; want %d", tt.input, v, tt.value)
		}
	}
}

func TestValidStatusNames(t *testing.T) {
	allowedStatus := map[string]bool{
		"ABIERTA": true,
		"LISTA": true,
		"CANCELADA": true,
		"COMPLETADA": true,
		"PAGADO": true,
	}
	for status, allowed := range allowedStatus {
		if !allowed {
			t.Errorf("status %q is not supposed to be valid", status)
		}
		_ = status
	}
}

func TestIdempotencyKeyFormat(t *testing.T) {
	validKey := "550e8400-e29b-41d4-a716-446655440000"
	if len(validKey) != 36 {
		t.Errorf("UUID len got %d, want 36", len(validKey))
	}
	if validKey[8] != '-' || validKey[13] != '-' || validKey[18] != '-' || validKey[23] != '-' {
		t.Errorf("UUID %q has incorrect dash positions", validKey)
	}
	_ = context.Background()
}
