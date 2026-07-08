CREATE DATABASE IF NOT EXISTS knowledge;

USE knowledge;

-- Directory ordering. Keep this block idempotent so the script can be re-run safely.
SET @has_dict_sort_number = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dict_directory'
      AND COLUMN_NAME = 'sort_number'
);

SET @sql = IF(
    @has_dict_sort_number = 0,
    'ALTER TABLE dict_directory ADD COLUMN sort_number BIGINT UNSIGNED NOT NULL DEFAULT 1 AFTER level',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    @has_dict_sort_number = 0,
    'UPDATE dict_directory d
     JOIN (
         SELECT id,
                ROW_NUMBER() OVER (
                    PARTITION BY dict_template_id, COALESCE(parent_id, 0)
                    ORDER BY id
                ) AS next_sort_number
         FROM dict_directory
         WHERE del = 0
     ) ranked ON ranked.id = d.id
     SET d.sort_number = ranked.next_sort_number',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Rich text content requires more room than the legacy TEXT column.
ALTER TABLE knowledge_item
MODIFY COLUMN scene_item_value MEDIUMTEXT NULL;

-- System access and operation audit log.
CREATE TABLE IF NOT EXISTS access_log (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NULL,
    user_account VARCHAR(100) NULL,
    module VARCHAR(100) NULL,
    action VARCHAR(100) NOT NULL,
    biz_type VARCHAR(100) NULL,
    biz_id BIGINT UNSIGNED NULL,
    scene_template_id BIGINT UNSIGNED NULL,
    description VARCHAR(1000) NULL,
    request_method VARCHAR(20) NULL,
    request_path VARCHAR(500) NULL,
    ip_address VARCHAR(100) NULL,
    user_agent VARCHAR(500) NULL,
    result VARCHAR(30) NOT NULL DEFAULT 'SUCCESS',
    error_message VARCHAR(1000) NULL,
    create_at DATETIME NOT NULL,
    INDEX idx_access_log_user_time (user_id, create_at),
    INDEX idx_access_log_action_time (action, create_at),
    INDEX idx_access_log_biz (biz_type, biz_id),
    INDEX idx_access_log_scene_time (scene_template_id, create_at)
);

-- Knowledge snapshots. This table powers both update records and historical versions.
CREATE TABLE IF NOT EXISTS knowledge_version (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    knowledge_id BIGINT UNSIGNED NOT NULL,
    scene_template_id BIGINT UNSIGNED NULL,
    version_no INT NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    operator_id BIGINT UNSIGNED NULL,
    operator_name VARCHAR(100) NULL,
    change_summary VARCHAR(1000) NULL,
    before_snapshot_json LONGTEXT NULL,
    after_snapshot_json LONGTEXT NULL,
    create_at DATETIME NOT NULL,
    UNIQUE KEY uk_knowledge_version (knowledge_id, version_no),
    INDEX idx_knowledge_version_knowledge_time (knowledge_id, create_at),
    INDEX idx_knowledge_version_scene_time (scene_template_id, create_at)
);

INSERT INTO sys_permission (code, name, type, module, description, status, sort_number, create_at, update_at)
VALUES
('knowledge:log:view-all', '查看全部操作记录', 'ACTION', '知识库', '查看授权场景下全部用户的知识操作记录', 'ENABLED', 54, NOW(), NOW()),
('knowledge:version:view', '查看知识历史版本', 'ACTION', '知识库', '查看知识更新记录和历史版本', 'ENABLED', 55, NOW(), NOW()),
('page:system:logs', '访问日志', 'PAGE', '页面权限', '访问系统访问日志页面', 'ENABLED', 165, NOW(), NOW()),
('system:log:view', '查看访问日志', 'ACTION', '系统管理', '查看登录、退出、查看和增删改等访问日志', 'ENABLED', 225, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    type = VALUES(type),
    module = VALUES(module),
    description = VALUES(description),
    status = 'ENABLED',
    sort_number = VALUES(sort_number),
    update_at = NOW();
