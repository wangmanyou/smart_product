package com.smartproduct.bootstrap;

import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DatabaseInitializer implements CommandLineRunner {
    private final JdbcTemplate jdbc;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public DatabaseInitializer(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
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

        Integer count = jdbc.queryForObject("select count(*) from `user` where account = 'admin'", Integer.class);
        if (count != null && count == 0) {
            jdbc.update("""
                    insert into `user` (is_builtin, account, nickname, role_id, password, email, is_disabled, phone_num, sex, picture, del, create_at, update_at)
                    values (true, 'admin', '超级管理员', 1, ?, '', false, '', '未知', '', 0, now(), now())
                    """, passwordEncoder.encode("Admin888888"));
        }
    }
}
