package com.smartproduct.user;

import java.time.LocalDateTime;

public record UserRow(
        Long id,
        Boolean disabled,
        Boolean builtin,
        String account,
        String nickname,
        String email,
        String phoneNum,
        String sex,
        String password,
        String picture,
        LocalDateTime createAt,
        LocalDateTime updateAt,
        Integer del,
        Long roleId
) {
}
