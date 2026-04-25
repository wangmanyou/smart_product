package com.smartproduct.user;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbc;

    private final RowMapper<UserRow> mapper = new RowMapper<>() {
        @Override
        public UserRow mapRow(ResultSet rs, int rowNum) throws SQLException {
            return new UserRow(
                    rs.getLong("id"),
                    rs.getBoolean("is_disabled"),
                    rs.getBoolean("is_builtin"),
                    rs.getString("account"),
                    rs.getString("nickname"),
                    rs.getString("email"),
                    rs.getString("phone_num"),
                    rs.getString("sex"),
                    rs.getString("password"),
                    rs.getString("picture"),
                    rs.getTimestamp("create_at") == null ? null : rs.getTimestamp("create_at").toLocalDateTime(),
                    rs.getTimestamp("update_at") == null ? null : rs.getTimestamp("update_at").toLocalDateTime(),
                    rs.getInt("del"),
                    rs.getLong("role_id")
            );
        }
    };

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<UserRow> findByAccount(String account) {
        List<UserRow> rows = jdbc.query("select * from `user` where account = ? and del = 0", mapper, account);
        return rows.stream().findFirst();
    }

    public Optional<UserRow> findById(Long id) {
        List<UserRow> rows = jdbc.query("select * from `user` where id = ? and del = 0", mapper, id);
        return rows.stream().findFirst();
    }

    public List<UserRow> list(int pageNumber, int pageSize, String account, String nickname, String email, String phone, String sex, String disabled) {
        StringBuilder sql = new StringBuilder("select * from `user` where del = 0");
        java.util.ArrayList<Object> args = new java.util.ArrayList<>();
        appendLike(sql, args, "account", account);
        appendLike(sql, args, "nickname", nickname);
        appendLike(sql, args, "email", email);
        appendLike(sql, args, "phone_num", phone);
        if (sex != null && !sex.isBlank()) {
            sql.append(" and sex = ?");
            args.add(sex);
        }
        if ("enabled".equals(disabled)) {
            sql.append(" and is_disabled = false");
        } else if ("disabled".equals(disabled)) {
            sql.append(" and is_disabled = true");
        }
        sql.append(" order by id asc limit ? offset ?");
        args.add(pageSize);
        args.add(Math.max(pageNumber - 1, 0) * pageSize);
        return jdbc.query(sql.toString(), mapper, args.toArray());
    }

    public int count(String account, String nickname, String email, String phone, String sex, String disabled) {
        StringBuilder sql = new StringBuilder("select count(*) from `user` where del = 0");
        java.util.ArrayList<Object> args = new java.util.ArrayList<>();
        appendLike(sql, args, "account", account);
        appendLike(sql, args, "nickname", nickname);
        appendLike(sql, args, "email", email);
        appendLike(sql, args, "phone_num", phone);
        if (sex != null && !sex.isBlank()) {
            sql.append(" and sex = ?");
            args.add(sex);
        }
        if ("enabled".equals(disabled)) {
            sql.append(" and is_disabled = false");
        } else if ("disabled".equals(disabled)) {
            sql.append(" and is_disabled = true");
        }
        Integer total = jdbc.queryForObject(sql.toString(), Integer.class, args.toArray());
        return total == null ? 0 : total;
    }

    public Long insert(UserRequests.AddUserRequest request, String passwordHash) {
        jdbc.update("""
                insert into `user` (is_builtin, account, nickname, role_id, password, email, is_disabled, phone_num, sex, picture, del, create_at, update_at)
                values (false, ?, ?, 0, ?, ?, false, ?, ?, ?, 0, now(), now())
                """,
                request.userAccount,
                empty(request.userNickname),
                passwordHash,
                empty(request.userEmail),
                empty(request.userPhoneNum),
                empty(request.userSex),
                empty(request.userPicture));
        return jdbc.queryForObject("select last_insert_id()", Long.class);
    }

    public void update(UserRequests.EditUserRequest request) {
        jdbc.update("""
                update `user`
                set nickname = ?, email = ?, phone_num = ?, sex = ?, picture = ?, update_at = now()
                where id = ? and del = 0
                """,
                empty(request.userNickname),
                empty(request.userEmail),
                empty(request.userPhoneNum),
                empty(request.userSex),
                empty(request.userPicture),
                request.userId);
    }

    public void updateDisabled(Long userId, Boolean disabled) {
        jdbc.update("update `user` set is_disabled = ?, update_at = now() where id = ? and del = 0", disabled, userId);
    }

    public void updatePassword(Long userId, String passwordHash) {
        jdbc.update("update `user` set password = ?, update_at = now() where id = ? and del = 0", passwordHash, userId);
    }

    public void softDelete(Long userId) {
        jdbc.update("update `user` set del = 1, update_at = now() where id = ? and del = 0", userId);
    }

    private static void appendLike(StringBuilder sql, List<Object> args, String column, String value) {
        if (value != null && !value.isBlank()) {
            sql.append(" and ").append(column).append(" like ?");
            args.add("%" + value + "%");
        }
    }

    private static String empty(String value) {
        return value == null ? "" : value;
    }
}
