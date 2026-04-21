package cons

const (
	NotFoundError  = "Not found"
	UserNameRegex  = `^[a-zA-Z0-9]+((?:-[a-zA-Z0-9]+)|(?:_[a-zA-Z0-9]+))*$`
	StrongPwdRegex = `^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{14,64}$`

	BadExtension = "不支持的文件后缀"

	// VersionIdError Version info
	VersionIdError               = "选择的版本不对"
	VersionNameError             = "版本名称已存在"
	DefaultVersionName           = "V1.0.0"
	DefaultSuffixCopyVersionName = "_copied"

	ExtractFileError = "文件解压缩失败"
	ObjectUrlError   = "对象存储地址错误"

	PageSizeError = "pageSize should be greater than 0"

	// DataSetNameError 数据集相关错误
	DataSetNameError  = "数据集名称已存在"
	DataSetIdNotFound = "数据集id不存在"

	ModelNameError = "模型名已存在"
	ModelIdError   = "模型id错误"

	ModelVersionIdError = "模型版本id错误"

	ServerInternalError = "服务器内部错误，请重试"

	KB = 1000
	MB = 1000 * 1000
	GB = 1000 * 1000 * 1000
)

var ErrMessageMap = map[int]string{
	0:   "success",
	800: VersionNameError,

	// 数据集相关错误
	1000: DataSetNameError,
	1001: DataSetIdNotFound,

	// 文件相关错误
	2000: ExtractFileError,
	2001: ObjectUrlError,

	// 数据集版本相关错误
	3000: VersionIdError,

	//模型相关错误
	4000: ModelIdError,
	4001: ModelNameError,

	4050: ModelVersionIdError,

	// 内部错误
	5000: ServerInternalError,
}
