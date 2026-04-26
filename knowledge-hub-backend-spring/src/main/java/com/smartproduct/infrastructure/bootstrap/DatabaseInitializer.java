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
