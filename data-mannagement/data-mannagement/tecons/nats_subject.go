package tecons

const (
	// RM(资源管理)相关

	NatsSubjectRMCreateFolderTenant         = "rm.create.folder.tenant"          // 创建租户
	NatsSubjectRMModifyFolderTenant         = "rm.modify.folder.tenant"          // 编辑租户
	NatsSubjectRMDelFolderTenant            = "rm.del.folder.tenant"             // 删除租户
	NatsSubjectRMDelAssetsTenant            = "rm.del.assets.tenant"             // 删除租户下资产
	NatsSubjectRMAddTenantUser              = "rm.add.tenant.user"               // 新增租户用户(用户加入租户)
	NatsSubjectRMDelTenantUser              = "rm.del.tenant.user"               // 删除租户用户(用户被移除租户)
	NatsSubjectRMModifyTenantUserRole       = "rm.modify.tenant.user.role"       // 修改租户用户角色(修改角色)
	NatsSubjectRMModifyTenantUserWorkspaces = "rm.modify.tenant.user.workspaces" // 修改租户用户可见工作空间
	NatsSubjectRMCreateFolderWorkspace      = "rm.create.folder.workspace"       // 创建工作空间
	NatsSubjectRMModifyFolderWorkspace      = "rm.modify.folder.workspace"       // 编辑工作空间
	NatsSubjectRMDelFolderWorkspace         = "rm.del.folder.workspace"          // 删除工作空间
	NatsSubjectRMDelAssetsWorkspace         = "rm.del.assets.workspace"          // 删除工作空间下资产
	NatsSubjectRMAddWorkspaceUser           = "rm.add.workspace.user"            // 新增工作空间用户(授予用户指定工作空间权限)
	NatsSubjectRMDelWorkspaceUser           = "rm.del.workspace.user"            // 删除工作空间用户(收回用户指定工作空间权限)
	NatsSubjectRMCreateFolderProject        = "rm.create.folder.project"         // 创建项目
	NatsSubjectRMModifyFolderProject        = "rm.modify.folder.project"         // 编辑项目
	NatsSubjectRMDelFolderProject           = "rm.del.folder.project"            // 删除项目
	NatsSubjectRMDelAssetsProject           = "rm.del.assets.project"            // 删除项目下资产

	// 用户相关

	NatsSubjectUserActivate       = "user.activate"        // 激活用户
	NatsSubjectSuspend            = "user.suspend"         // 禁用用户
	NatsSubjectUserDelUser        = "user.del.user"        // 删除用户(用户从平台硬删除), 业务服务可按需订阅该事件完成用户在相关业务痕迹的异步清理
	NatsSubjectUserModifyPwd      = "user.modify.pwd"      // 修改密码
	NatsSubjectUserModifyUsername = "user.modify.username" // 修改用户名
	NatsSubjectUserModifyEmail    = "user.modify.email"    // 修改邮箱

	// notebook相关

	NatsSubjectNotebookSnapshot = "notebook.snapshot.result"

	//  存储桶相关

	NatsSubjectDataManageCreatePrivateBucket   = "dm.create.private.bucket"     // 创建个人桶
	NatsSubjectDataManageDeletePrivateBucket   = "dm.delete.private.bucket"     // 删除个人桶
	NatsSubjectDataManageModifyPrivateBucket   = "dm.modify.private.bucket.acl" // 编辑个人桶权限
	NatsSubjectDataManageBeginTransmissionTask = "dm.begin.transmission.task"   // 开始数据迁移任务
	NatsSubjectDataManageEndTransmissionTask   = "dm.end.transmission.task"     // 数据迁移任务结束

	// AccessKey相关
	NatsSubjectAccessKeyCreate = "accesskey.create.s3" //创建s3类型的AccessKey
	NatsSubjectAccessKeyDelete = "accesskey.delete.s3" //删除s3类型的AccessKey

)
