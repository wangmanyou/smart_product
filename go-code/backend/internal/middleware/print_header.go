package middleware

import (
	"context"
	"fmt"

	"github.com/go-kratos/kratos/v2/middleware"
	"github.com/go-kratos/kratos/v2/transport"
)

// PrintHeader is middleware that print request headers.
func PrintHeader() middleware.Middleware {
	return func(handler middleware.Handler) middleware.Handler {
		return func(ctx context.Context, req interface{}) (reply interface{}, err error) {
			if tr, ok := transport.FromServerContext(ctx); ok {
				header := tr.RequestHeader()
				fmt.Println("^^^^^^^^^^^^^^^^^^^^^^header begin^^^^^^^^^^^^^^^^^^^^^^^^^^^")
				for _, key := range header.Keys() {
					fmt.Println(fmt.Sprintf("%s:%s", key, header.Get(key)))
				}
				fmt.Println("^^^^^^^^^^^^^^^^^^^^^^header end^^^^^^^^^^^^^^^^^^^^^^^^^^^")
			}
			return handler(ctx, req)
		}
	}
}
