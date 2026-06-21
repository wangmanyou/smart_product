CREATE DATABASE IF NOT EXISTS knowledge;

USE knowledge;

-- New Spring version requires a role table. The latest Go export may not contain it.
CREATE TABLE IF NOT EXISTS role (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    is_disabled BIT(1) NOT NULL DEFAULT b'0',
    is_builtin BIT(1) NOT NULL DEFAULT b'0',
    is_used BIT(1) NOT NULL DEFAULT b'0',
    name VARCHAR(255) NULL,
    remark VARCHAR(255) NULL,
    setting_json TEXT NULL,
    create_at DATETIME NULL,
    update_at DATETIME NULL,
    del TINYINT UNSIGNED NOT NULL DEFAULT 0
);

-- Add user.role_id if the Docker database was created by an older schema.
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'role_id') = 0,
    'ALTER TABLE `user` ADD COLUMN role_id BIGINT UNSIGNED NULL DEFAULT 0 AFTER nickname',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add role.setting_json for editable role authorization settings.
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role' AND COLUMN_NAME = 'setting_json') = 0,
    'ALTER TABLE role ADD COLUMN setting_json TEXT NULL AFTER remark',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS sys_permission (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(100) NULL,
    type VARCHAR(30) NULL,
    module VARCHAR(100) NULL,
    description VARCHAR(500) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ENABLED',
    sort_number INT NOT NULL DEFAULT 0,
    create_at DATETIME NULL,
    update_at DATETIME NULL,
    UNIQUE KEY uk_sys_permission_code (code)
);

CREATE TABLE IF NOT EXISTS user_role (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    create_at DATETIME NULL,
    UNIQUE KEY uk_user_role (user_id, role_id),
    INDEX idx_user_role_user (user_id),
    INDEX idx_user_role_role (role_id)
);

CREATE TABLE IF NOT EXISTS role_permission (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    create_at DATETIME NULL,
    UNIQUE KEY uk_role_permission (role_id, permission_id),
    INDEX idx_role_permission_role (role_id),
    INDEX idx_role_permission_permission (permission_id)
);

CREATE TABLE IF NOT EXISTS role_scene (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    scene_template_id BIGINT UNSIGNED NOT NULL,
    create_at DATETIME NULL,
    UNIQUE KEY uk_role_scene (role_id, scene_template_id),
    INDEX idx_role_scene_role (role_id),
    INDEX idx_role_scene_scene (scene_template_id)
);

CREATE TABLE IF NOT EXISTS role_permission_approval (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    permission_id BIGINT UNSIGNED NOT NULL,
    approval_required BIT(1) NOT NULL DEFAULT b'0',
    create_at DATETIME NULL,
    update_at DATETIME NULL,
    UNIQUE KEY uk_role_permission_approval (role_id, permission_id),
    INDEX idx_role_approval_role (role_id),
    INDEX idx_role_approval_permission (permission_id)
);

CREATE TABLE IF NOT EXISTS knowledge_change_request (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_type VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL,
    knowledge_id BIGINT UNSIGNED NULL,
    scene_template_id BIGINT UNSIGNED NULL,
    payload_json LONGTEXT NULL,
    before_json LONGTEXT NULL,
    reason VARCHAR(500) NULL,
    applicant_id BIGINT UNSIGNED NULL,
    applicant_name VARCHAR(100) NULL,
    reviewer_id BIGINT UNSIGNED NULL,
    reviewer_name VARCHAR(100) NULL,
    review_comment VARCHAR(500) NULL,
    reviewed_at DATETIME NULL,
    create_at DATETIME NULL,
    update_at DATETIME NULL,
    del TINYINT UNSIGNED NOT NULL DEFAULT 0,
    INDEX idx_change_request_status (status),
    INDEX idx_change_request_knowledge (knowledge_id),
    INDEX idx_change_request_applicant (applicant_id)
);

CREATE TABLE IF NOT EXISTS notification (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    recipient_id BIGINT UNSIGNED NOT NULL,
    sender_id BIGINT UNSIGNED NULL,
    sender_name VARCHAR(100) NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    content VARCHAR(1000) NULL,
    biz_type VARCHAR(50) NOT NULL,
    biz_id BIGINT UNSIGNED NULL,
    link_url VARCHAR(500) NULL,
    payload_json LONGTEXT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'INFO',
    read_at DATETIME NULL,
    archived TINYINT UNSIGNED NOT NULL DEFAULT 0,
    create_at DATETIME NOT NULL,
    update_at DATETIME NOT NULL,
    INDEX idx_notification_recipient_read (recipient_id, read_at),
    INDEX idx_notification_recipient_time (recipient_id, create_at),
    INDEX idx_notification_biz (biz_type, biz_id)
);

UPDATE notification n
JOIN knowledge_change_request r
    ON r.id = n.biz_id
    AND n.biz_type = 'CHANGE_REQUEST'
SET n.archived = 1,
    n.read_at = COALESCE(n.read_at, NOW()),
    n.update_at = NOW()
WHERE n.type = 'APPROVAL_PENDING'
    AND n.archived = 0
    AND r.status <> 'PENDING';

-- Request status values used by the backend:
-- PENDING: submitted and waiting for review; applicant can update or withdraw it.
-- APPROVED: reviewer approved it, and the change has already been applied to formal knowledge tables.
-- REJECTED: reviewer rejected it; applicant can delete the request record.
-- WITHDRAWN: applicant withdrew it before review; applicant can delete the request record.

INSERT INTO sys_permission (code, name, type, module, description, status, sort_number, create_at, update_at)
VALUES
('knowledge:view', '查看知识', 'ACTION', '知识库', '查看授权场景下的知识', 'ENABLED', 10, NOW(), NOW()),
('knowledge:create', '新增知识', 'ACTION', '知识库', '新增授权场景下的知识', 'ENABLED', 20, NOW(), NOW()),
('knowledge:update', '编辑知识', 'ACTION', '知识库', '编辑授权场景下的知识', 'ENABLED', 30, NOW(), NOW()),
('knowledge:delete', '删除知识', 'ACTION', '知识库', '删除授权场景下的知识', 'ENABLED', 40, NOW(), NOW()),
('knowledge:import', '导入知识', 'ACTION', '知识库', '批量导入知识', 'ENABLED', 50, NOW(), NOW()),
('knowledge:change-request:view-own', '查看我的审批', 'ACTION', '审批', '查看自己提交的知识变更申请', 'ENABLED', 60, NOW(), NOW()),
('knowledge:change-request:view-all', '查看全部审批', 'ACTION', '审批', '查看所有知识变更申请', 'ENABLED', 70, NOW(), NOW()),
('knowledge:change-request:approve', '审批通过', 'ACTION', '审批', '通过知识变更申请', 'ENABLED', 80, NOW(), NOW()),
('knowledge:change-request:reject', '审批驳回', 'ACTION', '审批', '驳回知识变更申请', 'ENABLED', 90, NOW(), NOW()),
('page:knowledge', '知识中心', 'PAGE', '页面权限', '访问知识中心页面', 'ENABLED', 100, NOW(), NOW()),
('page:statistics', '数据看板', 'PAGE', '页面权限', '访问数据看板页面', 'ENABLED', 110, NOW(), NOW()),
('page:system:dicts', '目录管理', 'PAGE', '页面权限', '访问目录管理页面', 'ENABLED', 120, NOW(), NOW()),
('page:system:scenes', '场景管理', 'PAGE', '页面权限', '访问场景管理页面', 'ENABLED', 130, NOW(), NOW()),
('page:system:users', '用户管理', 'PAGE', '页面权限', '访问用户管理页面', 'ENABLED', 140, NOW(), NOW()),
('page:system:roles', '角色管理', 'PAGE', '页面权限', '访问角色管理页面', 'ENABLED', 150, NOW(), NOW()),
('page:system:approvals', '变更审批', 'PAGE', '页面权限', '访问变更审批页面', 'ENABLED', 160, NOW(), NOW()),
('system:dict:manage', '目录管理', 'ACTION', '系统管理', '管理目录及目录字典配置', 'ENABLED', 170, NOW(), NOW()),
('system:scene:manage', '场景管理', 'ACTION', '系统管理', '管理业务场景和字段配置', 'ENABLED', 180, NOW(), NOW()),
('system:user:manage', '用户管理', 'ACTION', '系统管理', '管理用户、停用用户和重置密码', 'ENABLED', 190, NOW(), NOW()),
('system:role:manage', '角色管理', 'ACTION', '系统管理', '管理角色、页面权限、操作权限和授权场景', 'ENABLED', 200, NOW(), NOW()),
('system:permission:manage', '权限管理', 'ACTION', '系统管理', '维护权限字典', 'ENABLED', 210, NOW(), NOW()),
('system:approval:manage', '审批管理', 'ACTION', '系统管理', '查看和处理知识变更审批', 'ENABLED', 220, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    type = VALUES(type),
    module = VALUES(module),
    description = VALUES(description),
    status = 'ENABLED',
    sort_number = VALUES(sort_number),
    update_at = NOW();

INSERT INTO role (id, is_disabled, is_builtin, is_used, name, remark, setting_json, create_at, update_at, del)
VALUES (1, FALSE, TRUE, TRUE, '超级管理员', '系统内置管理员角色', '{"admin":true}', NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE
    is_builtin = TRUE,
    is_used = TRUE,
    setting_json = IF(setting_json IS NULL OR setting_json = '', '{"admin":true}', setting_json),
    update_at = NOW(),
    del = 0;

UPDATE `user`
SET role_id = 1
WHERE account = 'admin';

INSERT IGNORE INTO user_role (user_id, role_id, create_at)
SELECT id, role_id, NOW()
FROM `user`
WHERE role_id IS NOT NULL AND role_id > 0 AND del = 0;
