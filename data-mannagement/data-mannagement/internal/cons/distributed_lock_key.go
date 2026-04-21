package cons

import "time"

const (
	DistributedLockRdsKeyPrefix = RdsPrefix + "lock:"

	DefaultDistributedLockExpiration = time.Minute

	LockKeyMysqlSyncModel = DistributedLockRdsKeyPrefix + "mysql_sync_model"
	LockKeyExportEventLog = DistributedLockRdsKeyPrefix + "export_event_log"

	LockKeyFormatPattenTenant = DistributedLockRdsKeyPrefix + "tenant:%d"
	LockKeyFormatPattenUser   = DistributedLockRdsKeyPrefix + "user:%s"
)
