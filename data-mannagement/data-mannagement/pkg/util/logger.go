package util

import (
	"sync"

	"github.com/go-kratos/kratos/v2/log"
	"github.com/pkg/errors"
)

var defaultLogger = &loggerAppliance{
	Logger: NewFromLogger(log.GetLogger()),
}

type loggerAppliance struct {
	lock sync.Mutex
	*Logger
}

func (a *loggerAppliance) SetLogger(in *Logger) {
	a.lock.Lock()
	defer a.lock.Unlock()
	a.Logger = in
}

func (a *loggerAppliance) GetLogger() *Logger {
	return a.Logger
}

func Default() *Logger {
	return defaultLogger.GetLogger()
}

func SetDefault(logger *Logger) {
	defaultLogger.SetLogger(logger)
}

type Logger struct {
	*log.Helper
}

func New(h *log.Helper) *Logger {
	return &Logger{h}
}

func NewModuleLogger(l log.Logger, moduleName string, opts ...log.Option) *Logger {
	return New(log.NewHelper(log.With(l, "module", moduleName), opts...))
}

func NewFromLogger(l log.Logger, opts ...log.Option) *Logger {
	return New(log.NewHelper(l, opts...))
}

func (l *Logger) Err(errTag string, err error) {
	l.Errorw("err.tag", errTag, "err", errors.WithStack(err))
}
