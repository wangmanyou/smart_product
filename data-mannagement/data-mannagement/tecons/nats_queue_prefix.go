package tecons

// Nats 消费队列前缀名，集中维护，防止冲突

const (
	NatsQueuePrefixAlert       = "alert."
	NatsQueuePrefixApp         = "app."
	NatsQueuePrefixAuth        = "auth."
	NatsQueuePrefixCluster     = "cluster."
	NatsQueuePrefixDataSet     = "dataset."
	NatsQueuePrefixDataCenter  = "data.center."
	NatsQueuePrefixDataManage  = "data.manager."
	NatsQueuePrefixEventAgent  = "event.agent."
	NatsQueuePrefixEventServer = "event.server."
	NatsQueuePrefixImage       = "image."
	NatsQueuePrefixInference   = "inference."
	NatsQueuePrefixNotebook    = "notebook."
	NatsQueuePrefixSSH         = "ssh."
	NatsQueuePrefixTenant      = "tenant."
	NatsQueuePrefixTraining    = "training."
	NatsQueuePrefixBilling     = "billing."
	NatsQueuePrefixS3          = "s3."
)
