package com.smartproduct.user;

import com.smartproduct.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenService {
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, Long> tokens = new ConcurrentHashMap<>();

    public String issue(Long userId) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.put(token, userId);
        return token;
    }

    public Long resolve(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED.value(), "请重新登录");
        }
        String token = authorization.startsWith("Bearer ") ? authorization.substring(7) : authorization;
        Long userId = tokens.get(token);
        if (userId == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED.value(), "请重新登录");
        }
        return userId;
    }
}
