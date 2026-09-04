CREATE DATABASE IF NOT EXISTS knowledge;

USE knowledge;

-- AI knowledge retrieval foundation. Business knowledge remains in the existing
-- knowledge/knowledge_item tables; these tables only track the retrieval replica.
CREATE TABLE IF NOT EXISTS ai_rag_dataset_binding (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    scene_template_id BIGINT UNSIGNED NOT NULL,
    ragflow_dataset_id VARCHAR(100) NOT NULL,
    dataset_name VARCHAR(200) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ENABLED',
    create_at DATETIME NOT NULL,
    update_at DATETIME NOT NULL,
    UNIQUE KEY uk_ai_dataset_scene (scene_template_id),
    UNIQUE KEY uk_ai_dataset_id (ragflow_dataset_id),
    INDEX idx_ai_dataset_status (status)
);

CREATE TABLE IF NOT EXISTS ai_knowledge_document (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    knowledge_id BIGINT UNSIGNED NOT NULL,
    scene_template_id BIGINT UNSIGNED NOT NULL,
    knowledge_version INT NULL,
    source_type VARCHAR(30) NOT NULL DEFAULT 'MAIN',
    source_key VARCHAR(255) NOT NULL DEFAULT 'main',
    ragflow_dataset_id VARCHAR(100) NOT NULL,
    ragflow_document_id VARCHAR(100) NULL,
    content_hash VARCHAR(64) NULL,
    pending_ragflow_dataset_id VARCHAR(100) NULL,
    pending_ragflow_document_id VARCHAR(100) NULL,
    pending_content_hash VARCHAR(64) NULL,
    pending_knowledge_version INT NULL,
    sync_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    sync_error VARCHAR(2000) NULL,
    last_sync_at DATETIME NULL,
    create_at DATETIME NOT NULL,
    update_at DATETIME NOT NULL,
    UNIQUE KEY uk_ai_document_source (knowledge_id, source_type, source_key),
    INDEX idx_ai_document_scene (scene_template_id),
    INDEX idx_ai_document_status (sync_status),
    INDEX idx_ai_document_ragflow (ragflow_document_id),
    INDEX idx_ai_document_pending_ragflow (pending_ragflow_document_id)
);

CREATE TABLE IF NOT EXISTS ai_knowledge_sync_task (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    knowledge_id BIGINT UNSIGNED NOT NULL,
    knowledge_version INT NULL,
    task_type VARCHAR(30) NOT NULL,
    task_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    retry_count INT NOT NULL DEFAULT 0,
    next_retry_at DATETIME NULL,
    error_message VARCHAR(2000) NULL,
    rerun_required TINYINT(1) NOT NULL DEFAULT 0,
    create_at DATETIME NOT NULL,
    started_at DATETIME NULL,
    finished_at DATETIME NULL,
    active_knowledge_id BIGINT UNSIGNED GENERATED ALWAYS AS (
        CASE WHEN task_status IN ('PENDING', 'PROCESSING', 'PARSING') THEN knowledge_id ELSE NULL END
    ) STORED,
    UNIQUE KEY uk_ai_sync_task_active_knowledge (active_knowledge_id),
    INDEX idx_ai_sync_task_status (task_status, next_retry_at),
    INDEX idx_ai_sync_task_knowledge (knowledge_id)
);

CREATE TABLE IF NOT EXISTS ai_chat_session (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NULL,
    create_at DATETIME NOT NULL,
    update_at DATETIME NOT NULL,
    INDEX idx_ai_chat_session_user_time (user_id, update_at)
);

CREATE TABLE IF NOT EXISTS ai_chat_message (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role VARCHAR(30) NOT NULL,
    content LONGTEXT NOT NULL,
    reference_json LONGTEXT NULL,
    model_name VARCHAR(200) NULL,
    latency_ms BIGINT NULL,
    feedback VARCHAR(30) NULL,
    create_at DATETIME NOT NULL,
    INDEX idx_ai_chat_message_session_time (session_id, create_at),
    INDEX idx_ai_chat_message_user_time (user_id, create_at)
);

INSERT INTO sys_permission (code, name, type, module, description, status, sort_number, create_at, update_at)
VALUES
('page:ai-chat', '智能问答', 'PAGE', '知识库', '访问基于授权知识的智能问答页面', 'ENABLED', 115, NOW(), NOW()),
('ai:chat', '发起智能问答', 'ACTION', '知识库', '基于授权知识发起智能问答', 'ENABLED', 116, NOW(), NOW()),
('ai:chat:history', '查看问答历史', 'ACTION', '知识库', '查看自己的智能问答历史', 'ENABLED', 117, NOW(), NOW()),
('ai:chat:audit', '查看问答审计', 'ACTION', '知识库', '查看全部智能问答审计记录', 'ENABLED', 118, NOW(), NOW()),
('ai:knowledge:sync', '管理知识同步', 'ACTION', '知识库', '管理知识到智能检索库的同步任务', 'ENABLED', 119, NOW(), NOW())
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    type = VALUES(type),
    module = VALUES(module),
    description = VALUES(description),
    status = 'ENABLED',
    sort_number = VALUES(sort_number),
    update_at = NOW();


