package graph

import (
	"fmt"

	"github.com/vektah/gqlparser/v2/gqlerror"
)

type ErrorCode string

const (
	ErrNotFound        ErrorCode = "NOT_FOUND"
	ErrValidation      ErrorCode = "VALIDATION_ERROR"
	ErrUnauthorized    ErrorCode = "UNAUTHORIZED"
	ErrForbidden       ErrorCode = "FORBIDDEN"
	ErrConflict        ErrorCode = "CONFLICT"
	ErrRateLimited     ErrorCode = "RATE_LIMITED"
	ErrInternal        ErrorCode = "INTERNAL_ERROR"
	ErrPayment         ErrorCode = "PAYMENT_ERROR"
	ErrDuplicate       ErrorCode = "DUPLICATE_ENTRY"
	ErrExternalService ErrorCode = "EXTERNAL_SERVICE_ERROR"
)

func MakeError(msg string, code ErrorCode) *gqlerror.Error {
	return &gqlerror.Error{
		Message: msg,
		Extensions: map[string]interface{}{
			"code": string(code),
		},
	}
}

func MakeErrorf(code ErrorCode, format string, args ...interface{}) *gqlerror.Error {
	return MakeError(fmt.Sprintf(format, args...), code)
}
