package graph

import (
	"testing"
)

func TestMakeError(t *testing.T) {
	err := MakeError("usuario no encontrado", ErrNotFound)
	if err == nil {
		t.Fatal("expected non-nil error")
	}

	if err.Message != "usuario no encontrado" {
		t.Errorf("expected message 'usuario no encontrado', got %q", err.Message)
	}

	code, ok := err.Extensions["code"]
	if !ok {
		t.Fatal("expected extensions.code")
	}

	if code != string(ErrNotFound) {
		t.Errorf("expected code NOT_FOUND, got %v", code)
	}
}

func TestMakeErrorf(t *testing.T) {
	err := MakeErrorf(ErrValidation, "el campo %s es obligatorio", "email")
	if err == nil {
		t.Fatal("expected non-nil error")
	}

	expected := "el campo email es obligatorio"
	if err.Message != expected {
		t.Errorf("expected %q, got %q", expected, err.Message)
	}

	code, ok := err.Extensions["code"]
	if !ok {
		t.Fatal("expected extensions.code")
	}

	if code != string(ErrValidation) {
		t.Errorf("expected code VALIDATION_ERROR, got %v", code)
	}
}

func TestErrorCodes(t *testing.T) {
	codes := map[ErrorCode]string{
		ErrNotFound:         "NOT_FOUND",
		ErrValidation:       "VALIDATION_ERROR",
		ErrUnauthorized:     "UNAUTHORIZED",
		ErrForbidden:        "FORBIDDEN",
		ErrConflict:         "CONFLICT",
		ErrRateLimited:      "RATE_LIMITED",
		ErrInternal:         "INTERNAL_ERROR",
		ErrPayment:          "PAYMENT_ERROR",
		ErrDuplicate:        "DUPLICATE_ENTRY",
		ErrExternalService:  "EXTERNAL_SERVICE_ERROR",
	}

	for code, expected := range codes {
		if string(code) != expected {
			t.Errorf("code %v = %q, want %q", code, string(code), expected)
		}
	}
}
