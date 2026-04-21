package logz

import (
	"context"
	"fmt"
	"time"

	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

type Logger struct {
	logger *zap.Logger
}

type ServiceInfo struct {
	Module         string `json:"module"`
	ServiceId      string `json:"service.id"`
	ServiceName    string `json:"service.name"`
	ServiceVersion string `json:"service.version"`
}

func EpochNanosTimeEncoder(t time.Time, enc zapcore.PrimitiveArrayEncoder) {
	enc.AppendString(fmt.Sprint(t.UnixNano()))
}

func LevelEncoder(level zapcore.Level, enc zapcore.PrimitiveArrayEncoder) {
	switch level {
	case zapcore.DebugLevel:
		enc.AppendString("DEBUG")
	case zapcore.InfoLevel:
		enc.AppendString("INFO")
	case zapcore.WarnLevel:
		enc.AppendString("WARN")
	case zapcore.ErrorLevel:
		enc.AppendString("ERROR")
	case zapcore.DPanicLevel:
		enc.AppendString("ERROR2")
	case zapcore.PanicLevel:
		enc.AppendString("ERROR4")
	case zapcore.FatalLevel:
		enc.AppendString("FATAL")
	}
}

func (l *Logger) Ctx(ctx context.Context) *Logger {
	return &Logger{
		logger: l.logger.With(
			zap.Any("Resource", ctx.Value("Resource")),
			zap.Any("Attributes", ctx.Value("Attributes"))),
	}
}

func (l *Logger) Span(span trace.Span) *Logger {
	return &Logger{
		logger: l.logger.With(
			zap.String("TraceId", span.SpanContext().TraceID().String()),
			zap.String("SpanId", span.SpanContext().SpanID().String()),
			zap.String("TraceFlags", span.SpanContext().TraceFlags().String())),
	}
}

func (l *Logger) With(field ...zapcore.Field) *Logger {
	return &Logger{
		logger: l.logger.With(field...),
	}
}

func (l *Logger) WithOptions(opts ...zap.Option) *Logger {
	return &Logger{
		logger: l.logger.WithOptions(opts...),
	}
}

func (l *Logger) Debug(msg string, field ...zapcore.Field) {
	l.logger.Debug(msg, append(field, zap.Int8("SeverityNumber", 5))...)
}

func (l *Logger) Info(msg string, field ...zapcore.Field) {
	l.logger.Info(msg, append(field, zap.Int8("SeverityNumber", 9))...)
}

func (l *Logger) Infof(msg string, field ...interface{}) {
	l.logger.Info(fmt.Sprintf(msg, field...))
}

func (l *Logger) Warn(msg string, field ...zapcore.Field) {
	l.logger.Warn(msg, append(field, zap.Int8("SeverityNumber", 13))...)
}
func (l *Logger) Error(msg string, field ...zapcore.Field) {
	l.logger.Error(msg, append(field, zap.Int8("SeverityNumber", 17))...)
}

func (l *Logger) DPanic(msg string, field ...zapcore.Field) {
	l.logger.DPanic(msg, append(field, zap.Int8("SeverityNumber", 18))...)
}

func (l *Logger) Panic(msg string, field ...zapcore.Field) {
	l.logger.Panic(msg, append(field, zap.Int8("SeverityNumber", 20))...)
}

func (l *Logger) Fatal(msg string, field ...zapcore.Field) {
	l.logger.Fatal(msg, append(field, zap.Int8("SeverityNumber", 21))...)
}

func (l *Logger) Instance() *zap.Logger {
	return l.logger
}
