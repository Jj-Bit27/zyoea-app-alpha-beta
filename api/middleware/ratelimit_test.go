package middleware

import (
	"testing"
)

func TestMaskIP(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"IPv4 full", "192.168.1.100", "192.168.1.0"},
		{"IPv4 localhost", "127.0.0.1", "127.0.0.0"},
		{"IPv6", "::1", "::1"},
		{"empty", "", ""},
		{"invalid", "not-an-ip", "not-an-ip"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := maskIP(tt.input)
			if result != tt.expected {
				t.Errorf("maskIP(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}

func TestMaskIPConsistency(t *testing.T) {
	// Same subnet should produce same mask
	ip1 := "10.0.0.50"
	ip2 := "10.0.0.100"
	ip3 := "10.0.1.50"

	m1 := maskIP(ip1)
	m2 := maskIP(ip2)
	m3 := maskIP(ip3)

	if m1 != m2 {
		t.Errorf("expected same mask for same subnet: %q vs %q", m1, m2)
	}

	if m1 == m3 {
		t.Errorf("expected different mask for different subnet: %q vs %q", m1, m3)
	}
}
