package biz

import "github.com/google/wire"

// ProviderSet is biz providers.
var ProviderSet = wire.NewSet(NewDataManageUC, NewDictManageUC,
	NewSceneManageUC, NewBusinessManageUC, NewUserManageUC,
	NewRoleManageUC)
