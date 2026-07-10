package com.smartproduct.service;

import com.smartproduct.infrastructure.config.JwtProperties;
import com.smartproduct.shared.exception.ApiException;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.Locale;

@Service
public class TokenService {
    private static final int MINIMUM_KEY_BYTES = 32;

    private final SecretKey jwtKey;
    private final JwtParser jwtParser;
    private final String issuer;
    private final String audience;
    private final long tokenTtlSeconds;

    public TokenService(JwtProperties properties) {
        this.issuer = requireSetting(properties.issuer(), "JWT issuer");
        this.audience = requireSetting(properties.audience(), "JWT audience");
        this.tokenTtlSeconds = requirePositiveTtl(properties.ttlSeconds());

        byte[] keyBytes = loadKeyBytes(properties);
        try {
            this.jwtKey = Keys.hmacShaKeyFor(keyBytes);
        } finally {
            Arrays.fill(keyBytes, (byte) 0);
        }

        this.jwtParser = Jwts.parser()
                .verifyWith(jwtKey)
                .requireIssuer(issuer)
                .requireAudience(audience)
                .build();
    }

    public String issue(Long userId, String userAccount) {
        if (userId == null || userId <= 0 || userAccount == null || userAccount.isBlank()) {
            throw new IllegalArgumentException("Cannot issue JWT without a valid user identity");
        }
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(issuer)
                .audience().add(audience).and()
                .subject(String.valueOf(userId))
                .claim("user_id", userId)
                .claim("user_account", userAccount)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(tokenTtlSeconds)))
                .signWith(jwtKey, Jwts.SIG.HS256)
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
            Jws<Claims> parsedToken = jwtParser.parseSignedClaims(token);
            if (!Jwts.SIG.HS256.getId().equals(parsedToken.getHeader().getAlgorithm())) {
                throw unauthorized();
            }
            Claims claims = parsedToken.getPayload();

            Number userIdClaim = claims.get("user_id", Number.class);
            String subject = claims.getSubject();
            String account = claims.get("user_account", String.class);
            Date issuedAt = claims.getIssuedAt();
            Date expiration = claims.getExpiration();
            if (userIdClaim == null || subject == null || subject.isBlank()
                    || account == null || account.isBlank()
                    || issuedAt == null || expiration == null
                    || !expiration.after(issuedAt)) {
                throw unauthorized();
            }

            Long userId;
            try {
                userId = Long.valueOf(userIdClaim.toString());
            } catch (NumberFormatException ex) {
                throw unauthorized();
            }
            if (userId <= 0 || !subject.equals(String.valueOf(userId))) {
                throw unauthorized();
            }
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
        if (!authorization.startsWith("Bearer ")) {
            throw unauthorized();
        }
        String token = authorization.substring(7);
        if (token.isBlank()) {
            throw unauthorized();
        }
        return token;
    }

    private static byte[] loadKeyBytes(JwtProperties properties) {
        String encodedSecret = readConfiguredSecret(properties);
        if (isPlaceholder(encodedSecret)) {
            throw configurationError("JWT secret still contains an example/placeholder value");
        }

        byte[] keyBytes;
        try {
            keyBytes = Base64.getDecoder().decode(encodedSecret);
        } catch (IllegalArgumentException ex) {
            throw configurationError("JWT secret must be Base64 encoded", ex);
        }
        if (keyBytes.length < MINIMUM_KEY_BYTES) {
            Arrays.fill(keyBytes, (byte) 0);
            throw configurationError("JWT secret must decode to at least 32 bytes (256 bits)");
        }
        return keyBytes;
    }

    private static String readConfiguredSecret(JwtProperties properties) {
        String secretFile = normalize(properties.secretFile());
        if (secretFile != null) {
            try {
                Path path = Path.of(secretFile).toAbsolutePath().normalize();
                if (!Files.isRegularFile(path)) {
                    throw configurationError("JWT secret file does not exist or is not a regular file");
                }
                String value = normalize(Files.readString(path, StandardCharsets.UTF_8));
                if (value == null) {
                    throw configurationError("JWT secret file is empty");
                }
                return value;
            } catch (InvalidPathException ex) {
                throw configurationError("JWT secret file path is invalid", ex);
            } catch (IOException ex) {
                throw configurationError("JWT secret file cannot be read", ex);
            }
        }

        String secret = normalize(properties.secret());
        if (secret == null) {
            throw configurationError("JWT secret is not configured; set APP_JWT_SECRET_FILE or APP_JWT_SECRET");
        }
        return secret;
    }

    private static String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static boolean isPlaceholder(String value) {
        String normalized = value.toLowerCase(Locale.ROOT);
        return normalized.contains("replace-with")
                || normalized.contains("change-me")
                || normalized.contains("example-secret");
    }

    private static String requireSetting(String value, String settingName) {
        String normalized = normalize(value);
        if (normalized == null) {
            throw configurationError(settingName + " is not configured");
        }
        return normalized;
    }

    private static long requirePositiveTtl(long ttlSeconds) {
        if (ttlSeconds <= 0) {
            throw configurationError("JWT ttl-seconds must be greater than zero");
        }
        return ttlSeconds;
    }

    private static IllegalStateException configurationError(String message) {
        return new IllegalStateException(message);
    }

    private static IllegalStateException configurationError(String message, Exception cause) {
        return new IllegalStateException(message, cause);
    }

    private static ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED.value(), "请重新登录");
    }

    public record TokenUser(Long userId, String userAccount) {
    }
}
