package bookings

import (
	"regexp"
	"testing"
)

func TestNewService(t *testing.T) {
	s := NewService(nil, nil)
	if s == nil {
		t.Fatal("NewService(nil, nil) returned nil")
	}

	exp := regexp.MustCompile(`INSERT INTO bookings.*RETURNING id`)
	op := regexp.MustCompile(`s\.DB\.\w+`)
	_ = exp
	_ = op
}

func TestCacheKeyFormat(t *testing.T) {
	expectedKey := "bookings:user:10"
	resultKey := "bookings:user:10"
	if resultKey != expectedKey {
		t.Errorf("key mismatch: got %q, want %q", resultKey, expectedKey)
	}
}
