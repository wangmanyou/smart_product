package logz

import (
	"context"

	"go.uber.org/zap/zapcore"

	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
)

var defaultLogger *Logger

func Init(s *ServiceInfo) {
	SetDefault(New(s))
}

func New(s *ServiceInfo) *Logger {
	config := zap.NewProductionConfig()
	config.OutputPaths = []string{"stderr"}
	config.EncoderConfig.TimeKey = "Timestamp"
	config.EncoderConfig.EncodeTime = EpochNanosTimeEncoder
	config.EncoderConfig.LevelKey = "SeverityText"
	config.EncoderConfig.EncodeLevel = LevelEncoder
	config.EncoderConfig.MessageKey = "Body"

	logger, _ := config.Build()
	l := &Logger{
		logger: logger.With(
			zap.String("Mode", s.Module),
			zap.String("ServiceID", s.ServiceId),
			zap.String("ServiceName", s.ServiceName),
			zap.String("ServiceVersion", s.ServiceVersion),
		),
	}

	return l.WithOptions(zap.AddCallerSkip(2))
}

// Default returns a default logger instance.
func Default() *Logger {
	return defaultLogger
}

// SetDefault sets the default logger instance.
func SetDefault(l *Logger) {
	defaultLogger = l
}

func Ctx(ctx context.Context) {
	defaultLogger.Ctx(ctx)
}

func Span(span trace.Span) {
	defaultLogger.Span(span)
}

func Debug(msg string, fields ...zapcore.Field) {
	defaultLogger.Debug(msg, fields...)
}

func Info(msg string, fields ...zapcore.Field) {
	defaultLogger.Info(msg, fields...)
}

func Warn(msg string, fields ...zapcore.Field) {
	defaultLogger.Warn(msg, fields...)
}
func Error(msg string, fields ...zapcore.Field) {
	defaultLogger.Error(msg, fields...)
}

func DPanic(msg string, fields ...zapcore.Field) {
	defaultLogger.DPanic(msg, fields...)
}

func Panic(msg string, fields ...zapcore.Field) {
	defaultLogger.Panic(msg, fields...)
}

func Fatal(msg string, fields ...zapcore.Field) {
	defaultLogger.Fatal(msg, fields...)
}

func Err(msg string, err error, fields ...zapcore.Field) {
	defaultLogger.Error(msg, append(fields, zap.Error(err))...)
}
