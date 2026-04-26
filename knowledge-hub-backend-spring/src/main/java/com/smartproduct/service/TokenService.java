package com.smartproduct.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class TokenService {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String JWT_SECRET = "your_secret_key";
    private static final long TOKEN_TTL_SECONDS = 24 * 60 * 60;
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

    public String issue(Long userId, String userAccount) {
        long expiresAt = Instant.now().getEpochSecond() + TOKEN_TTL_SECONDS;
        Map<String, Object> header = new LinkedHashMap<>();
        header.put("alg", "HS256");
        header.put("typ", "JWT");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("user_id", userId);
        payload.put("user_account", userAccount);
        payload.put("expires_at", expiresAt);
        String unsigned = base64UrlJson(header) + "." + base64UrlJson(payload);
        return unsigned + "." + sign(unsigned);
    }

    public TokenUser resolve(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            throw unauthorized();
        }
        String token = authorization.startsWith("Bearer ") ? authorization.substring(7) : authorization;
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                throw unauthorized();
            }
            String unsigned = parts[0] + "." + parts[1];
            if (!constantTimeEquals(sign(unsigned), parts[2])) {
                throw unauthorized();
            }
            Map<String, Object> claims = JSON.readValue(BASE64_URL_DECODER.decode(parts[1]), new TypeReference<>() {
            });
            long expiresAt = ((Number) claims.get("expires_at")).longValue();
            if (Instant.now().getEpochSecond() > expiresAt) {
                throw unauthorized();
            }
            return new TokenUser(((Number) claims.get("user_id")).longValue(), String.valueOf(claims.get("user_account")));
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw unauthorized();
        }
    }

    private static ApiException unauthorized() {
        return new ApiException(HttpStatus.UNAUTHORIZED.value(), "请重新登录");
    }

    private static String base64UrlJson(Map<String, Object> value) {
        try {
            return BASE64_URL_ENCODER.encodeToString(JSON.writeValueAsBytes(value));
        } catch (Exception ex) {
            throw new IllegalStateException("JWT encode failed", ex);
        }
    }

    private static String sign(String unsigned) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(JWT_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(unsigned.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("JWT sign failed", ex);
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        byte[] left = a.getBytes(StandardCharsets.UTF_8);
        byte[] right = b.getBytes(StandardCharsets.UTF_8);
        if (left.length != right.length) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < left.length; i++) {
            result |= left[i] ^ right[i];
        }
        return result == 0;
    }

    public record TokenUser(Long userId, String userAccount) {
    }
}
