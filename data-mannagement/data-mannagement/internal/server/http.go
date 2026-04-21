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
	"github.com/go-kratos/kratos/v2/transport/http"
)

// NewHTTPServer new an HTTP server.
func NewHTTPServer(c *conf.Server, roleManageService *service.RoleManageService, dataManageService *service.DataManageService, dictManageService *service.DictManageService, sceneManageService *service.SceneManageService, businessManageService *service.BusinessManageService, userManageService *service.UserManageService, logger log.Logger) *http.Server {
	var opts = []http.ServerOption{
		http.Middleware(
			recovery.Recovery(),
			logging.Server(logger),
			validate.Validator(),
			middleware.PrintHeader(),
			middleware.AuthMiddleware(),
		),
	}
	if c.Http.Network != "" {
		opts = append(opts, http.Network(c.Http.Network))
	}
	if c.Http.Addr != "" {
		opts = append(opts, http.Address(c.Http.Addr))
	}
	if c.Http.Timeout != nil {
		opts = append(opts, http.Timeout(c.Http.Timeout.AsDuration()))
	}
	srv := http.NewServer(opts...)
	datamanageV1.RegisterDataManageHTTPServer(srv, dataManageService)
	dictmanageV1.RegisterDictManageHTTPServer(srv, dictManageService)
	scenemanageV1.RegisterSceneManageHTTPServer(srv, sceneManageService)
	route := srv.Route("/v1")
	route.POST("/data/business/upload/file", businessManageService.UploadFile)
	businessmanageV1.RegisterBusinessManageHTTPServer(srv, businessManageService)

	usermanageV1.RegisterUserManageHTTPServer(srv, userManageService)
	rolemanageV1.RegisterRoleManageHTTPServer(srv, roleManageService)
	return srv
}
