//go:build wireinject
// +build wireinject

// The build tag makes sure the stub is not built in the final build.

package main

import (
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/biz"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/conf"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/data"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/server"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/service"

	"github.com/go-kratos/kratos/v2"
	"github.com/go-kratos/kratos/v2/log"
	"github.com/google/wire"
)

// wireApp init kratos application.
func wireApp(*conf.Server, *conf.Data, log.Logger) (*kratos.App, func(), error) {
	panic(wire.Build(server.ProviderSet, data.ProviderSet, biz.ProviderSet, service.ProviderSet, newApp))
}
