package com.smartproduct.service;

import com.smartproduct.shared.exception.ApiException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Service
public class TokenService {
    private static final String JWT_SECRET = "smart-product-knowledge-hub-jwt-secret-at-least-256-bits";
    private static final long TOKEN_TTL_SECONDS = 24 * 60 * 60;
    private static final SecretKey JWT_KEY = Keys.hmacShaKeyFor(JWT_SECRET.getBytes(StandardCharsets.UTF_8));

    public String issue(Long userId, String userAccount) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("user_id", userId)
                .claim("user_account", userAccount)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(TOKEN_TTL_SECONDS)))
                .signWith(JWT_KEY)
                .compact();
    }

    public TokenUser resolve(String authorization) {
        return resolveToken(extract(authorization));
    }

    public TokenUser resolveToken(String token) {
        try {
            if (token == null || token.isBlank()) {
                throw unauthorized();
            }
            Claims claims = Jwts.parser()
                    .verifyWith(JWT_KEY)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Long userId = claims.get("user_id", Number.class).longValue();
            String account = claims.get("user_account", String.class);
            return new TokenUser(userId, account);
        } catch (ApiException ex) {
            throw ex;
        } catch (JwtException | IllegalArgumentException ex) {
            throw unauthorized();
        }
    }

    public String extract(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            throw unauthorized();
        }
        return authorization.startsWith("Bearer ") ? authorization.substring(7) : authorization;
    }

    private static ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED.value(), "请重新登录");
    }

    public record TokenUser(Long userId, String userAccount) {
    }
}
