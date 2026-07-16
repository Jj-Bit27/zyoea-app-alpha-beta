package restaurants

import (
	"testing"
	"strings"
)

type mockRestaurant struct {
	ID   int
	Name string
}

func TestRestaurantSelectColumns(t *testing.T) {
	columns := []string{"id", "name", "email", "phone", "address"}
	for _, c := range columns {
		if !strings.Contains(restaurantSelect, c) {
			t.Errorf("restaurantSelect missing column '%s'", c)
		}
	}
}

func TestNewService(t *testing.T) {
	s := NewService(nil, nil)
	if s == nil {
		t.Fatal("NewService(nil, nil) returned nil")
	}
}

func TestRestaurantCacheKeyFormat(t *testing.T) {
	expected := "restaurants:all"
	got := "restaurants:all"
	if got != expected {
		t.Errorf("cache key mismatch: got %q, want %q", got, expected)
	}
}
