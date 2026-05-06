package com.smartproduct.infrastructure.bootstrap;

import org.springframework.boot.CommandLineRunner;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.UUID;

@Component
public class DatabaseInitializer implements CommandLineRunner {
    private static final String LOCK_KEY = "teco_dataset_lock:mysql_sync_model";
    private static final String DEFAULT_ADMIN_PASSWORD_HASH = "$2a$10$.qIRmuIe9HWt6eVhxM0BEezfSMDGeaDydK669iiXST4i0S/8TZWzy";

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
            seedPermissions();
            seedAdminRole();
            seedAdmin();
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
                    role_id bigint unsigned null default 0,
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
                    setting_json text null,
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
                    scene_item_value text null,
                    select_dict_tree_ids text null,
                    index idx_knowledge_id (knowledge_id),
                    index idx_scene_item_id (scene_item_id)
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
    }

    private void seedPermissions() {
        upsertPermission("knowledge:view", "查看知识", "ACTION", "知识库", "查看授权场景下的知识", 10);
        upsertPermission("knowledge:create", "新增知识", "ACTION", "知识库", "新增授权场景下的知识", 20);
        upsertPermission("knowledge:update", "编辑知识", "ACTION", "知识库", "编辑授权场景下的知识", 30);
        upsertPermission("knowledge:delete", "删除知识", "ACTION", "知识库", "删除授权场景下的知识", 40);
        upsertPermission("knowledge:import", "导入知识", "ACTION", "知识库", "批量导入知识", 50);
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
        upsertPermission("system:manage", "系统管理", "ACTION", "系统管理", "管理用户、角色和系统配置", 170);
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
                    insert into role (id, is_disabled, is_builtin, is_used, name, remark, setting_json, create_at, update_at, del)
                    values (1, false, true, true, '超级管理员', '系统内置管理员角色', '{"admin":true}', now(), now(), 0)
                    """);
        }
    }

    private void seedAdmin() {
        Integer count = jdbc.queryForObject("select count(*) from `user` where account = 'admin'", Integer.class);
        if (count != null && count == 0) {
            jdbc.update("""
                    insert into `user` (is_builtin, account, nickname, role_id, password, email, is_disabled, phone_num, sex, picture, del, create_at, update_at)
                    values (true, 'admin', '超级管理员', 1, ?, '', false, '', '未知', '', 0, now(), now())
                    """, DEFAULT_ADMIN_PASSWORD_HASH);
        }
    }
}
