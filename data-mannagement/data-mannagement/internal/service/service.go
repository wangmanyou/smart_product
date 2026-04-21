package service

import "github.com/google/wire"

// ProviderSet is service providers.
var ProviderSet = wire.NewSet(NewDataManageService, NewDictManageService,
	NewSceneManageService, NewBusinessManageService, NewUserManageService,
	NewRoleManageService)
