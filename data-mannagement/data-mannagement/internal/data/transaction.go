package data

import (
	"context"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/irepo"

	"github.com/xormplus/xorm"
)

var _ irepo.ITransaction = (*TransactionHelper)(nil)
var th = &TransactionHelper{sKey: key{}}

type key = struct{}

type TransactionHelper struct {
	x    *xorm.Engine
	sKey key
}

func NewTransactionHelper(x *xorm.Engine) irepo.ITransaction {
	return &TransactionHelper{x: x, sKey: key{}}
}

func (t *TransactionHelper) Transaction(ctx context.Context, fns ...irepo.TransFunc) error {
	if _, err := t.x.Transaction(func(s *xorm.Session) (interface{}, error) {
		for _, f := range fns {
			if e := f(context.WithValue(ctx, t.sKey, s)); e != nil {
				return nil, e
			}
		}
		return nil, nil
	}); err != nil {
		return err
	}
	return nil
}
