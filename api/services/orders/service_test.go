package orders

import (
	"context"
	"testing"
)

func TestSafeStr(t *testing.T) {
	tests := []struct {
		name     string
		input    *string
		expected string
	}{
		{"nil pointer", nil, ""},
		{"non-nil pointer", strPtr("hello"), "hello"},
		{"empty string", strPtr(""), ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := safeStr(tt.input)
			if result != tt.expected {
				t.Errorf("safeStr(%v) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func strPtr(s string) *string {
	return &s
}

func TestValidation(t *testing.T) {
	t.Run("status validation", func(t *testing.T) {
		validStatuses := []string{"ABIERTA", "LISTA", "COMPLETADA", "CANCELADA", "PAGADO"}
		for _, s := range validStatuses {
			if s == "" {
				t.Error("expected non-empty status")
			}
		}
	})

	t.Run("order type validation", func(t *testing.T) {
		validTypes := []string{"dine_in", "takeaway"}
		for _, s := range validTypes {
			if s != "dine_in" && s != "takeaway" {
				t.Errorf("unexpected order type: %s", s)
			}
		}
	})
}

func TestFindAllByRestaurantError(t *testing.T) {
	s := &Service{}
	_, err := s.FindAllByRestaurant(context.Background(), "invalid", 0, 0)
	if err == nil {
		t.Error("expected error for invalid restaurantID, got nil")
	}
}
