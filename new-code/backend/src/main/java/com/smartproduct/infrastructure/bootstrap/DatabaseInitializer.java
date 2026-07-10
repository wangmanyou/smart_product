package com.smartproduct.infrastructure.bootstrap;

import org.springframework.boot.CommandLineRunner;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Component
public class DatabaseInitializer implements CommandLineRunner {
    private static final String LOCK_KEY = "teco_dataset_lock:mysql_sync_model";
    private static final String DEFAULT_ADMIN_PASSWORD_HASH = "$2a$10$.qIRmuIe9HWt6eVhxM0BEezfSMDGeaDydK669iiXST4i0S/8TZWzy";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final JdbcTemplate jdbc;
    private final StringRedisTemplate redis;

    public DatabaseInitializer(JdbcTemplate jdbc, StringRedisTemplate redis) {
        this.jdbc = jdbc;
        this.redis = redis;
    }

    @Override
    public void run(String... args) {
        String lockValue = UUID.randomUUID().toString();
        Boolean locked = redis.opsForValue().setIfAbsent(LOCK_KEY, lockValue, Duration.ofMinutes(1));
        if (!Boolean.TRUE.equals(locked)) {
            return;
        }
        try {
            createTables();
            ensureEnhancementSchema();
            cleanupStaleApprovalNotifications();
            seedPermissions();
            seedAdminRole();
            seedAdmin();
            syncLegacyUserRoles();
            migrateRoleSettings();
            seedAdminUserRole();
            seedAdminRolePermissions();
        } finally {
            if (lockValue.equals(redis.opsForValue().get(LOCK_KEY))) {
                redis.delete(LOCK_KEY);
            }
        }
    }

    private void createTables() {
        jdbc.execute("""
                create table if not exists `user` (
                    id bigint unsigned not null auto_increment primary key,
                    is_disabled bit(1) not null default b'0',
                    is_builtin bit(1) not null default b'0',
                    account varchar(100) not null,
                    nickname varchar(100) null,
                    password varchar(100) not null,
                    email varchar(100) null,
                    phone_num varchar(50) null,
                    sex varchar(20) null,
                    picture varchar(500) null,
                    del tinyint unsigned not null default 0,
                    create_at datetime null,
                    update_at datetime null,
                    unique key uk_user_account (account)
                )
                """);
        jdbc.execute("""
                create table if not exists role (
                    id bigint unsigned not null auto_increment primary key,
                    is_disabled bit(1) not null default b'0',
                    is_builtin bit(1) not null default b'0',
                    is_used bit(1) not null default b'0',
                    name varchar(255) null,
                    remark varchar(255) null,
                    create_at datetime null,
                    update_at datetime null,
                    del tinyint unsigned not null default 0
                )
                """);
        jdbc.execute("""
                create table if not exists dict_template (
                    id bigint unsigned not null auto_increment primary key,
                    name varchar(255) null,
                    type varchar(50) null,
                    is_builtin bit(1) not null default b'0',
                    is_disabled bit(1) not null default b'0',
                    is_used bit(1) not null default b'0',
                    create_at datetime null,
                    update_at datetime null,
                    user_id bigint unsigned null,
                    user_name varchar(100) null,
                    del tinyint unsigned not null default 0
                )
                """);
        jdbc.execute("""
                create table if not exists dict_directory (
                    id bigint unsigned not null auto_increment primary key,
                    dict_template_id bigint unsigned null,
                    is_disabled bit(1) not null default b'0',
                    is_used bit(1) not null default b'0',
                    name varchar(255) null,
                    parent_id bigint unsigned null default 0,
                    level bigint unsigned null default 0,
                    sort_number bigint unsigned not null default 1,
                    create_at datetime null,
                    update_at datetime null,
                    del tinyint unsigned not null default 0,
                    index idx_dict_template_id (dict_template_id),
                    index idx_parent_id (parent_id)
                )
                """);
        jdbc.execute("""
                create table if not exists scene_template (
                    id bigint unsigned not null auto_increment primary key,
                    copy_from_id bigint unsigned null default 0,
                    name varchar(255) null,
                    is_builtin bit(1) not null default b'0',
                    is_disabled bit(1) not null default b'0',
                    is_used bit(1) not null default b'0',
                    create_at datetime null,
                    update_at datetime null,
                    user_id bigint unsigned null,
                    user_name varchar(100) null,
                    del tinyint unsigned not null default 0
                )
                """);
        jdbc.execute("""
                create table if not exists scene_item (
                    id bigint unsigned not null auto_increment primary key,
                    name varchar(255) null,
                    sort_number bigint unsigned not null default 1,
                    type varchar(50) null,
                    dict_template_id bigint unsigned null default 0,
                    scene_template_id bigint unsigned null,
                    del tinyint unsigned not null default 0,
                    multi_value bit(1) not null default b'0',
                    is_hide bit(1) not null default b'0',
                    is_required bit(1) not null default b'0',
                    is_support_search bit(1) not null default b'1',
                    index idx_scene_template_id (scene_template_id)
                )
                """);
        jdbc.execute("""
                create table if not exists knowledge (
                    id bigint unsigned not null auto_increment primary key,
                    scene_template_id bigint unsigned null,
                    view_time bigint unsigned not null default 0,
                    view_at datetime null,
                    create_at datetime null,
                    update_at datetime null,
                    creator_id bigint unsigned null,
                    creator_name varchar(100) null,
                    del tinyint unsigned not null default 0,
                    index idx_scene_template_id (scene_template_id)
                )
                """);
        jdbc.execute("""
                create table if not exists knowledge_item (
                    id bigint unsigned not null auto_increment primary key,
                    knowledge_id bigint unsigned null,
                    scene_item_id bigint unsigned null,
                    scene_item_value mediumtext null,
                    select_dict_tree_ids text null,
                    index idx_knowledge_id (knowledge_id),
                    index idx_scene_item_id (scene_item_id)
                )
                """);
        jdbc.execute("""
                create table if not exists user_role (
                    id bigint unsigned not null auto_increment primary key,
                    user_id bigint unsigned not null,
                    role_id bigint unsigned not null,
                    create_at datetime null,
                    unique key uk_user_role (user_id, role_id),
                    index idx_user_role_user (user_id),
                    index idx_user_role_role (role_id)
                )
                """);
        jdbc.execute("""
                create table if not exists sys_permission (
                    id bigint unsigned not null auto_increment primary key,
                    code varchar(100) not null,
                    name varchar(100) null,
                    type varchar(30) null,
                    module varchar(100) null,
                    description varchar(500) null,
                    status varchar(30) not null default 'ENABLED',
                    sort_number int not null default 0,
                    create_at datetime null,
                    update_at datetime null,
                    unique key uk_sys_permission_code (code)
                )
                """);
        jdbc.execute("""
                create table if not exists role_permission (
                    id bigint unsigned not null auto_increment primary key,
                    role_id bigint unsigned not null,
                    permission_id bigint unsigned not null,
                    create_at datetime null,
                    unique key uk_role_permission (role_id, permission_id),
                    index idx_role_permission_role (role_id),
                    index idx_role_permission_permission (permission_id)
                )
                """);
        jdbc.execute("""
                create table if not exists role_scene (
                    id bigint unsigned not null auto_increment primary key,
                    role_id bigint unsigned not null,
                    scene_template_id bigint unsigned not null,
                    create_at datetime null,
                    unique key uk_role_scene (role_id, scene_template_id),
                    index idx_role_scene_role (role_id),
                    index idx_role_scene_scene (scene_template_id)
                )
                """);
        jdbc.execute("""
                create table if not exists role_permission_approval (
                    id bigint unsigned not null auto_increment primary key,
                    role_id bigint unsigned not null,
                    permission_id bigint unsigned not null,
                    approval_required bit(1) not null default b'0',
                    create_at datetime null,
                    update_at datetime null,
                    unique key uk_role_permission_approval (role_id, permission_id),
                    index idx_role_approval_role (role_id),
                    index idx_role_approval_permission (permission_id)
                )
                """);
        jdbc.execute("""
                create table if not exists knowledge_change_request (
                    id bigint unsigned not null auto_increment primary key,
                    request_type varchar(30) not null,
                    status varchar(30) not null,
                    knowledge_id bigint unsigned null,
                    scene_template_id bigint unsigned null,
                    payload_json longtext null,
                    before_json longtext null,
                    reason varchar(500) null,
                    applicant_id bigint unsigned null,
                    applicant_name varchar(100) null,
                    reviewer_id bigint unsigned null,
                    reviewer_name varchar(100) null,
                    review_comment varchar(500) null,
                    reviewed_at datetime null,
                    create_at datetime null,
                    update_at datetime null,
                    del tinyint unsigned not null default 0,
                    index idx_change_request_status (status),
                    index idx_change_request_knowledge (knowledge_id),
                    index idx_change_request_applicant (applicant_id)
                )
                """);
        jdbc.execute("""
                create table if not exists notification (
                    id bigint unsigned not null auto_increment primary key,
                    recipient_id bigint unsigned not null,
                    sender_id bigint unsigned null,
                    sender_name varchar(100) null,
                    type varchar(50) not null,
                    title varchar(200) not null,
                    content varchar(1000) null,
                    biz_type varchar(50) not null,
                    biz_id bigint unsigned null,
                    link_url varchar(500) null,
                    payload_json longtext null,
                    level varchar(20) not null default 'INFO',
                    read_at datetime null,
                    archived tinyint unsigned not null default 0,
                    create_at datetime not null,
                    update_at datetime not null,
                    index idx_notification_recipient_read (recipient_id, read_at),
                    index idx_notification_recipient_time (recipient_id, create_at),
                    index idx_notification_biz (biz_type, biz_id)
                )
                """);
        jdbc.execute("""
                create table if not exists access_log (
                    id bigint unsigned not null auto_increment primary key,
                    user_id bigint unsigned null,
                    user_account varchar(100) null,
                    module varchar(100) null,
                    action varchar(100) not null,
                    biz_type varchar(100) null,
                    biz_id bigint unsigned null,
                    scene_template_id bigint unsigned null,
                    description varchar(1000) null,
                    request_method varchar(20) null,
                    request_path varchar(500) null,
                    ip_address varchar(100) null,
                    user_agent varchar(500) null,
                    result varchar(30) not null default 'SUCCESS',
                    error_message varchar(1000) null,
                    create_at datetime not null,
                    index idx_access_log_user_time (user_id, create_at),
                    index idx_access_log_action_time (action, create_at),
                    index idx_access_log_biz (biz_type, biz_id),
                    index idx_access_log_scene_time (scene_template_id, create_at)
                )
                """);
        jdbc.execute("""
                create table if not exists knowledge_version (
                    id bigint unsigned not null auto_increment primary key,
                    knowledge_id bigint unsigned not null,
                    scene_template_id bigint unsigned null,
                    version_no int not null,
                    operation_type varchar(50) not null,
                    operator_id bigint unsigned null,
                    operator_name varchar(100) null,
                    change_summary varchar(1000) null,
                    before_snapshot_json longtext null,
                    after_snapshot_json longtext null,
                    create_at datetime not null,
                    unique key uk_knowledge_version (knowledge_id, version_no),
                    index idx_knowledge_version_knowledge_time (knowledge_id, create_at),
                    index idx_knowledge_version_scene_time (scene_template_id, create_at)
                )
                """);
    }

    private void ensureEnhancementSchema() {
        if (!columnExists("dict_directory", "sort_number")) {
            jdbc.execute("alter table dict_directory add column sort_number bigint unsigned not null default 1 after level");
            initializeDirectorySortNumbers();
        }
        String knowledgeItemValueType = columnDataType("knowledge_item", "scene_item_value");
        if ("text".equalsIgnoreCase(knowledgeItemValueType)) {
            jdbc.execute("alter table knowledge_item modify column scene_item_value mediumtext null");
        }
    }

    private void initializeDirectorySortNumbers() {
        List<Map<String, Object>> rows = jdbc.queryForList("""
                select id, dict_template_id, coalesce(parent_id, 0) as parent_id
                from dict_directory
                where del = 0
                order by dict_template_id, coalesce(parent_id, 0), id
                """);
        String lastGroup = "";
        long nextSortNumber = 0;
        for (Map<String, Object> row : rows) {
            String group = String.valueOf(row.get("dict_template_id")) + ":" + String.valueOf(row.get("parent_id"));
            if (!group.equals(lastGroup)) {
                lastGroup = group;
                nextSortNumber = 1;
            } else {
                nextSortNumber++;
            }
            jdbc.update("update dict_directory set sort_number = ? where id = ?", nextSortNumber, row.get("id"));
        }
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbc.queryForObject("""
                select count(*)
                from information_schema.COLUMNS
                where TABLE_SCHEMA = database()
                    and TABLE_NAME = ?
                    and COLUMN_NAME = ?
                """, Integer.class, tableName, columnName);
        return count != null && count > 0;
    }

    private String columnDataType(String tableName, String columnName) {
        List<String> types = jdbc.queryForList("""
                select DATA_TYPE
                from information_schema.COLUMNS
                where TABLE_SCHEMA = database()
                    and TABLE_NAME = ?
                    and COLUMN_NAME = ?
                """, String.class, tableName, columnName);
        return types.isEmpty() ? "" : types.get(0);
    }

    private void cleanupStaleApprovalNotifications() {
        jdbc.update("""
                update notification n
                join knowledge_change_request r
                    on r.id = n.biz_id
                    and n.biz_type = 'CHANGE_REQUEST'
                set n.archived = 1,
                    n.read_at = coalesce(n.read_at, now()),
                    n.update_at = now()
                where n.type = 'APPROVAL_PENDING'
                    and n.archived = 0
                    and r.status <> 'PENDING'
                """);
    }

    private void seedPermissions() {
        upsertPermission("knowledge:view", "查看知识", "ACTION", "知识库", "查看授权场景下的知识", 10);
        upsertPermission("knowledge:create", "新增知识", "ACTION", "知识库", "新增授权场景下的知识", 20);
        upsertPermission("knowledge:update", "编辑知识", "ACTION", "知识库", "编辑授权场景下的知识", 30);
        upsertPermission("knowledge:delete", "删除知识", "ACTION", "知识库", "删除授权场景下的知识", 40);
        upsertPermission("knowledge:import", "导入知识", "ACTION", "知识库", "批量导入知识", 50);
        upsertPermission("knowledge:log:view-all", "查看全部操作记录", "ACTION", "知识库", "查看授权场景下全部用户的知识操作记录", 54);
        upsertPermission("knowledge:version:view", "查看知识历史版本", "ACTION", "知识库", "查看知识历史版本详情", 55);
        upsertPermission("knowledge:change-request:view-own", "查看我的审批", "ACTION", "审批", "查看自己提交的知识变更申请", 60);
        upsertPermission("knowledge:change-request:view-all", "查看全部审批", "ACTION", "审批", "查看所有知识变更申请", 70);
        upsertPermission("knowledge:change-request:approve", "审批通过", "ACTION", "审批", "通过知识变更申请", 80);
        upsertPermission("knowledge:change-request:reject", "审批驳回", "ACTION", "审批", "驳回知识变更申请", 90);
        upsertPermission("page:knowledge", "知识中心", "PAGE", "页面权限", "访问知识中心页面", 100);
        upsertPermission("page:statistics", "数据看板", "PAGE", "页面权限", "访问数据看板页面", 110);
        upsertPermission("page:system:dicts", "目录管理", "PAGE", "页面权限", "访问目录管理页面", 120);
        upsertPermission("page:system:scenes", "场景管理", "PAGE", "页面权限", "访问场景管理页面", 130);
        upsertPermission("page:system:users", "用户管理", "PAGE", "页面权限", "访问用户管理页面", 140);
        upsertPermission("page:system:roles", "角色管理", "PAGE", "页面权限", "访问角色管理页面", 150);
        upsertPermission("page:system:approvals", "变更审批", "PAGE", "页面权限", "访问变更审批页面", 160);
        upsertPermission("page:system:logs", "访问日志", "PAGE", "页面权限", "访问系统访问日志页面", 165);
        upsertPermission("system:dict:manage", "目录管理", "ACTION", "系统管理", "管理目录及目录字典配置", 170);
        upsertPermission("system:scene:manage", "场景管理", "ACTION", "系统管理", "管理业务场景和字段配置", 180);
        upsertPermission("system:user:manage", "用户管理", "ACTION", "系统管理", "管理用户、停用用户和重置密码", 190);
        upsertPermission("system:role:manage", "角色管理", "ACTION", "系统管理", "管理角色、页面权限、操作权限和授权场景", 200);
        upsertPermission("system:permission:manage", "权限管理", "ACTION", "系统管理", "维护权限字典", 210);
        upsertPermission("system:approval:manage", "审批管理", "ACTION", "系统管理", "查看和处理知识变更审批", 220);
        upsertPermission("system:log:view", "查看访问日志", "ACTION", "系统管理", "查看登录、退出、查看和增删改等访问日志", 225);
        jdbc.update("delete from sys_permission where code = 'system:manage'");
    }

    private void upsertPermission(String code, String name, String type, String module, String description, int sortNumber) {
        jdbc.update("""
                insert into sys_permission (code, name, type, module, description, status, sort_number, create_at, update_at)
                values (?, ?, ?, ?, ?, 'ENABLED', ?, now(), now())
                on duplicate key update
                    name = values(name),
                    type = values(type),
                    module = values(module),
                    description = values(description),
                    status = 'ENABLED',
                    sort_number = values(sort_number),
                    update_at = now()
                """, code, name, type, module, description, sortNumber);
    }

    private void seedAdminRole() {
        Integer count = jdbc.queryForObject("select count(*) from role where id = 1", Integer.class);
        if (count != null && count == 0) {
            jdbc.update("""
                    insert into role (id, is_disabled, is_builtin, is_used, name, remark, create_at, update_at, del)
                    values (1, false, true, true, '超级管理员', '系统内置管理员角色', now(), now(), 0)
                    """);
        }
    }

    private void seedAdmin() {
        Integer count = jdbc.queryForObject("select count(*) from `user` where account = 'admin'", Integer.class);
        if (count != null && count == 0) {
            jdbc.update("""
                    insert into `user` (is_builtin, account, nickname, password, email, is_disabled, phone_num, sex, picture, del, create_at, update_at)
                    values (true, 'admin', '超级管理员', ?, '', false, '', '未知', '', 0, now(), now())
                    """, DEFAULT_ADMIN_PASSWORD_HASH);
        }
    }

    private void syncLegacyUserRoles() {
        if (!columnExists("user", "role_id")) {
            return;
        }
        jdbc.update("""
                insert ignore into user_role (user_id, role_id, create_at)
                select id, role_id, now()
                from `user`
                where role_id is not null and role_id > 0 and del = 0
                """);
        jdbc.execute("alter table `user` drop column role_id");
    }

    @SuppressWarnings("unchecked")
    private void migrateRoleSettings() {
        if (!columnExists("role", "setting_json")) {
            return;
        }
        List<Map<String, Object>> rows = jdbc.queryForList("select id, setting_json from role where del = 0");
        for (Map<String, Object> row : rows) {
            Long roleId = ((Number) row.get("id")).longValue();
            String settingJson = (String) row.get("setting_json");
            if (settingJson == null || settingJson.isBlank()) {
                continue;
            }
            Map<String, Object> setting;
            try {
                setting = JSON.readValue(settingJson, MAP_TYPE);
            } catch (Exception ignored) {
                continue;
            }
            if (jdbc.queryForObject("select count(*) from role_permission where role_id = ?", Integer.class, roleId) == 0) {
                for (Object code : list(setting.get("pagePermissions"))) {
                    insertRolePermission(roleId, String.valueOf(code));
                }
                for (Object code : list(setting.get("operationPermissions"))) {
                    insertRolePermission(roleId, String.valueOf(code));
                }
            }
            if (jdbc.queryForObject("select count(*) from role_scene where role_id = ?", Integer.class, roleId) == 0) {
                for (Object sceneId : list(setting.get("sceneTemplateIds"))) {
                    Long id = number(sceneId);
                    if (id != null && id > 0) {
                        jdbc.update("insert ignore into role_scene (role_id, scene_template_id, create_at) values (?, ?, now())", roleId, id);
                    }
                }
            }
            if (jdbc.queryForObject("select count(*) from role_permission_approval where role_id = ?", Integer.class, roleId) == 0
                    && setting.get("approvalRequired") instanceof Map<?, ?> approvalMap) {
                approvalMap.forEach((code, required) -> {
                    if (Boolean.TRUE.equals(required)) {
                        jdbc.update("""
                                        insert ignore into role_permission_approval (role_id, permission_id, approval_required, create_at, update_at)
                                        select ?, id, true, now(), now()
                                        from sys_permission
                                        where code = ?
                                        """,
                                roleId, String.valueOf(code));
                    }
                });
            }
        }
        jdbc.execute("alter table role drop column setting_json");
    }

    private void seedAdminUserRole() {
        jdbc.update("""
                insert ignore into user_role (user_id, role_id, create_at)
                select id, 1, now()
                from `user`
                where account = 'admin' and del = 0
                """);
    }

    private void seedAdminRolePermissions() {
        jdbc.update("""
                insert ignore into role_permission (role_id, permission_id, create_at)
                select 1, id, now()
                from sys_permission
                where status = 'ENABLED'
                """);
        jdbc.update("""
                insert ignore into role_scene (role_id, scene_template_id, create_at)
                select 1, id, now()
                from scene_template
                where del = 0
                """);
    }

    private void insertRolePermission(Long roleId, String code) {
        jdbc.update("""
                        insert ignore into role_permission (role_id, permission_id, create_at)
                        select ?, id, now()
                        from sys_permission
                        where code = ?
                        """,
                roleId, code);
    }

    private static List<?> list(Object value) {
        return value instanceof List<?> list ? list : List.of();
    }

    private static Long number(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return value == null ? null : Long.valueOf(String.valueOf(value));
        } catch (Exception ignored) {
            return null;
        }
    }
}
