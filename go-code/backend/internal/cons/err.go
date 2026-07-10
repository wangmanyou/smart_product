package cons

import (
	"gitee.com/kangdan0404/backend-of-knowledge-base/tecons"
	"github.com/go-kratos/kratos/v2/errors"
)

var (
	ErrNotFound     = errors.NotFound(tecons.NotFound, NotFoundError)
	ErrBadExtension = errors.BadRequest(tecons.BadRequest, BadExtension)

	ErrVersionNameExists = errors.Conflict(tecons.Conflict, VersionNameError)
	ErrVersionIdError    = errors.BadRequest(tecons.BadRequest, VersionIdError)

	ErrDataSetNameExists = errors.Conflict(tecons.Conflict, DataSetNameError)
	ErrDataSetIdNotFound = errors.Conflict(tecons.NotFound, DataSetIdNotFound)

	ErrModelNameExists = errors.Conflict(tecons.Conflict, ModelNameError)
	ErrModelIdNotFound = errors.Conflict(tecons.Conflict, ModelIdError)

	ErrModelVersionIdNotFound = errors.Conflict(tecons.Conflict, ModelVersionIdError)

	ErrPageSize = errors.BadRequest(tecons.BadRequest, PageSizeError)
)
