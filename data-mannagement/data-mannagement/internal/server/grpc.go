package server

import (
	businessmanageV1 "gitee.com/kangdan0404/backend-of-knowledge-base/api/businessmanage/v1"

	datamanageV1 "gitee.com/kangdan0404/backend-of-knowledge-base/api/datamanage/v1"
	dictmanageV1 "gitee.com/kangdan0404/backend-of-knowledge-base/api/dictmanage/v1"
	rolemanageV1 "gitee.com/kangdan0404/backend-of-knowledge-base/api/rolemanage/v1"
	scenemanageV1 "gitee.com/kangdan0404/backend-of-knowledge-base/api/scenemanage/v1"
	usermanageV1 "gitee.com/kangdan0404/backend-of-knowledge-base/api/usermanage/v1"

	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/conf"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/middleware"
	"gitee.com/kangdan0404/backend-of-knowledge-base/internal/service"
	"github.com/go-kratos/kratos/v2/middleware/logging"
	"github.com/go-kratos/kratos/v2/middleware/validate"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/go-kratos/kratos/v2/middleware/recovery"
	"github.com/go-kratos/kratos/v2/transport/grpc"
)

// NewGRPCServer new a gRPC server.
func NewGRPCServer(c *conf.Server, roleManageService *service.RoleManageService, userManageService *service.UserManageService, dataManageService *service.DataManageService, dictManageService *service.DictManageService, sceneManageService *service.SceneManageService, businessManageService *service.BusinessManageService, logger log.Logger) *grpc.Server {
	var opts = []grpc.ServerOption{
		grpc.Middleware(
			recovery.Recovery(),
			logging.Server(logger),
			validate.Validator(),
			middleware.PrintHeader(),
			middleware.AuthMiddleware(),
		),
	}
	if c.Grpc.Network != "" {
		opts = append(opts, grpc.Network(c.Grpc.Network))
	}
	if c.Grpc.Addr != "" {
		opts = append(opts, grpc.Address(c.Grpc.Addr))
	}
	if c.Grpc.Timeout != nil {
		opts = append(opts, grpc.Timeout(c.Grpc.Timeout.AsDuration()))
	}
	srv := grpc.NewServer(opts...)
	datamanageV1.RegisterDataManageServer(srv, dataManageService)
	dictmanageV1.RegisterDictManageServer(srv, dictManageService)
	scenemanageV1.RegisterSceneManageServer(srv, sceneManageService)
	businessmanageV1.RegisterBusinessManageServer(srv, businessManageService)
	usermanageV1.RegisterUserManageServer(srv, userManageService)
	rolemanageV1.RegisterRoleManageServer(srv, roleManageService)
	return srv
}
