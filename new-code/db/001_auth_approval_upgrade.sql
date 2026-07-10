CREATE DATABASE IF NOT EXISTS knowledge;

USE knowledge;

CREATE TABLE IF NOT EXISTS role (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    is_disabled BIT(1) NOT NULL DEFAULT b'0',
    is_builtin BIT(1) NOT NULL DEFAULT b'0',
    is_used BIT(1) NOT NULL DEFAULT b'0',
    name VARCHAR(255) NULL,
    remark VARCHAR(255) NULL,
    create_at DATETIME NULL,
    update_at DATETIME NULL,
    del TINYINT UNSIGNED NOT NULL DEFAULT 0
);

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

INSERT INTO sys_permission (code, name, type, module, description, status, sort_number, create_at, update_at)
VALUES
('knowledge:view', 'View knowledge', 'ACTION', 'Knowledge', 'View authorized knowledge', 'ENABLED', 10, NOW(), NOW()),
('knowledge:create', 'Create knowledge', 'ACTION', 'Knowledge', 'Create authorized knowledge', 'ENABLED', 20, NOW(), NOW()),
('knowledge:update', 'Update knowledge', 'ACTION', 'Knowledge', 'Update authorized knowledge', 'ENABLED', 30, NOW(), NOW()),
('knowledge:delete', 'Delete knowledge', 'ACTION', 'Knowledge', 'Delete authorized knowledge', 'ENABLED', 40, NOW(), NOW()),
('knowledge:import', 'Import knowledge', 'ACTION', 'Knowledge', 'Import knowledge in batches', 'ENABLED', 50, NOW(), NOW()),
('knowledge:log:view-all', 'View all knowledge logs', 'ACTION', 'Knowledge', 'View all knowledge operation logs', 'ENABLED', 54, NOW(), NOW()),
('knowledge:version:view', 'View knowledge versions', 'ACTION', 'Knowledge', 'View knowledge version history', 'ENABLED', 55, NOW(), NOW()),
('knowledge:change-request:view-own', 'View own approvals', 'ACTION', 'Approval', 'View own knowledge change requests', 'ENABLED', 60, NOW(), NOW()),
('knowledge:change-request:view-all', 'View all approvals', 'ACTION', 'Approval', 'View all knowledge change requests', 'ENABLED', 70, NOW(), NOW()),
('knowledge:change-request:approve', 'Approve change', 'ACTION', 'Approval', 'Approve knowledge change requests', 'ENABLED', 80, NOW(), NOW()),
('knowledge:change-request:reject', 'Reject change', 'ACTION', 'Approval', 'Reject knowledge change requests', 'ENABLED', 90, NOW(), NOW()),
('page:knowledge', 'Knowledge center', 'PAGE', 'Page', 'Access knowledge center', 'ENABLED', 100, NOW(), NOW()),
('page:statistics', 'Statistics', 'PAGE', 'Page', 'Access statistics page', 'ENABLED', 110, NOW(), NOW()),
('page:system:dicts', 'Directory management', 'PAGE', 'Page', 'Access directory management', 'ENABLED', 120, NOW(), NOW()),
('page:system:scenes', 'Scene management', 'PAGE', 'Page', 'Access scene management', 'ENABLED', 130, NOW(), NOW()),
('page:system:users', 'User management', 'PAGE', 'Page', 'Access user management', 'ENABLED', 140, NOW(), NOW()),
('page:system:roles', 'Role management', 'PAGE', 'Page', 'Access role management', 'ENABLED', 150, NOW(), NOW()),
('page:system:approvals', 'Change approvals', 'PAGE', 'Page', 'Access change approvals', 'ENABLED', 160, NOW(), NOW()),
('page:system:logs', 'Access logs', 'PAGE', 'Page', 'Access system logs', 'ENABLED', 165, NOW(), NOW()),
('system:dict:manage', 'Manage directories', 'ACTION', 'System', 'Manage directories', 'ENABLED', 170, NOW(), NOW()),
('system:scene:manage', 'Manage scenes', 'ACTION', 'System', 'Manage scenes', 'ENABLED', 180, NOW(), NOW()),
('system:user:manage', 'Manage users', 'ACTION', 'System', 'Manage users', 'ENABLED', 190, NOW(), NOW()),
('system:role:manage', 'Manage roles', 'ACTION', 'System', 'Manage roles', 'ENABLED', 200, NOW(), NOW()),
('system:permission:manage', 'Manage permissions', 'ACTION', 'System', 'Manage permission dictionary', 'ENABLED', 210, NOW(), NOW()),
('system:approval:manage', 'Manage approvals', 'ACTION', 'System', 'Manage approvals', 'ENABLED', 220, NOW(), NOW()),
('system:log:view', 'View system logs', 'ACTION', 'System', 'View system access logs', 'ENABLED', 225, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    type = VALUES(type),
    module = VALUES(module),
    description = VALUES(description),
    status = 'ENABLED',
    sort_number = VALUES(sort_number),
    update_at = NOW();

DELETE FROM sys_permission WHERE code = 'system:manage';

INSERT INTO role (id, is_disabled, is_builtin, is_used, name, remark, create_at, update_at, del)
VALUES (1, FALSE, TRUE, TRUE, '超级管理员', '系统内置管理员角色', NOW(), NOW(), 0)
ON DUPLICATE KEY UPDATE
    is_builtin = TRUE,
    is_used = TRUE,
    update_at = NOW(),
    del = 0;

INSERT IGNORE INTO user_role (user_id, role_id, create_at)
SELECT id, 1, NOW()
FROM `user`
WHERE account = 'admin' AND del = 0;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'role_id') > 0,
    'INSERT IGNORE INTO user_role (user_id, role_id, create_at) SELECT id, role_id, NOW() FROM `user` WHERE role_id IS NOT NULL AND role_id > 0 AND del = 0',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

INSERT IGNORE INTO role_permission (role_id, permission_id, create_at)
SELECT 1, id, NOW()
FROM sys_permission
WHERE status = 'ENABLED';

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'role_id') > 0,
    'ALTER TABLE `user` DROP COLUMN role_id',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'role' AND COLUMN_NAME = 'setting_json') > 0,
    'ALTER TABLE role DROP COLUMN setting_json',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
