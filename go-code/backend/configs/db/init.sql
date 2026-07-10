CREATE DATABASE IF NOT EXISTS knowledge;

use knowledge;

-- 初始化用户
INSERT INTO user (id, is_builtin, account, nickname, role_id, password,email,is_disabled,phone_num,sex,picture,del,create_at,update_at)
VALUES (1, 1, 'admin', '超级管理员', 1, '$2a$10$.qIRmuIe9HWt6eVhxM0BEezfSMDGeaDydK669iiXST4i0S/8TZWzy','',0,'','未知','',0,NOW(),NOW())
    ON DUPLICATE KEY UPDATE
     is_builtin = VALUES(is_builtin),
     account = VALUES(account),
     nickname = VALUES(nickname),
     role_id = VALUES(role_id),
     password = VALUES(password),
     email = VALUES(email),
    is_disabled = VALUES(is_disabled),
    phone_num = VALUES(phone_num),
    sex = VALUES(sex),
    picture = VALUES(picture),
    del = VALUES(del);



