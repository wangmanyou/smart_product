package tecons

// Nats持久化JetStream 根据消息来源定义，如资源管理器(租户服务)相关消息都用js-rm
// 注意： nats限制不同JetStream的subjects不能重叠，因此强烈建议直接使用v2/tecmq/nats_jetstream.go中内置配置创建/获取jetstrem

const (
	NatsJetStreamAll = "js-all" // 全平台统一用该js
)
