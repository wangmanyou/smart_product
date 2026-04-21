package irepo

import "context"

type TransFunc func(ctx context.Context) error

type ITransaction interface {
	Transaction(ctx context.Context, fns ...TransFunc) error
}
