package tecons

// Nats JetStream消费者前缀名，集中维护，防止冲突
// 建议 consumerName格式： 前缀.消息源分组名称.自定义
// 例如 s3服务消费租户消息 s3.rm.tenants
// 例如 数据集服务消费用户消息 dataset.user

const (
	NatsConsumerPrefixAlert       = "alert."
	NatsConsumerPrefixApp         = "app."
	NatsConsumerPrefixAuth        = "auth."
	NatsConsumerPrefixCluster     = "cluster."
	NatsConsumerPrefixDataSet     = "dataset."
	NatsConsumerPrefixDataCenter  = "data.center."
	NatsConsumerPrefixDataManage  = "data.manager."
	NatsConsumerPrefixEventAgent  = "event.agent."
	NatsConsumerPrefixEventServer = "event.server."
	NatsConsumerPrefixImage       = "image."
	NatsConsumerPrefixInference   = "inference."
	NatsConsumerPrefixNotebook    = "notebook."
	NatsConsumerPrefixSSH         = "ssh."
	NatsConsumerPrefixTenant      = "tenant."
	NatsConsumerPrefixTraining    = "training."
	NatsConsumerPrefixBilling     = "billing."
	NatsConsumerPrefixS3          = "s3."
)
