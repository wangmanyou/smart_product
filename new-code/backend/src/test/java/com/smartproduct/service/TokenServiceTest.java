package com.smartproduct.service;

import com.smartproduct.infrastructure.config.JwtProperties;
import com.smartproduct.shared.exception.ApiException;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TokenServiceTest {
    private static final String ISSUER = "smart-product-spring";
    private static final String AUDIENCE = "smart-product-web";
    private static final String TEST_SECRET = Base64.getEncoder().encodeToString(
            "unit-test-key-material-that-is-at-least-forty-eight-bytes-long".getBytes(StandardCharsets.UTF_8));

    @Test
    void issuesAndResolvesTokenWithConfiguredIdentity() {
        TokenService service = service(TEST_SECRET);

        String token = service.issue(42L, "admin");

        TokenService.TokenUser user = service.resolve("Bearer " + token);
        assertThat(user.userId()).isEqualTo(42L);
        assertThat(user.userAccount()).isEqualTo("admin");
    }

    @Test
    void rejectsTokenSignedWithFormerStaticKey() {
        String compromisedFormerKey = "smart-product-knowledge-hub-jwt-secret-at-least-256-bits";
        SecretKey oldKey = Keys.hmacShaKeyFor(compromisedFormerKey.getBytes(StandardCharsets.UTF_8));
        String token = token(oldKey, ISSUER, AUDIENCE, Instant.now().minusSeconds(1), Instant.now().plusSeconds(60), true);

        assertUnauthorized(() -> service(TEST_SECRET).resolveToken(token));
    }

    @Test
    void rejectsTamperedToken() {
        TokenService service = service(TEST_SECRET);
        String[] parts = service.issue(42L, "admin").split("\\.");
        parts[2] = (parts[2].startsWith("A") ? "B" : "A") + parts[2].substring(1);

        assertUnauthorized(() -> service.resolveToken(String.join(".", parts)));
    }

    @Test
    void rejectsExpiredToken() {
        SecretKey key = key(TEST_SECRET);
        String token = token(key, ISSUER, AUDIENCE, Instant.now().minusSeconds(120), Instant.now().minusSeconds(60), true);

        assertUnauthorized(() -> service(TEST_SECRET).resolveToken(token));
    }

    @Test
    void rejectsWrongIssuer() {
        SecretKey key = key(TEST_SECRET);
        String token = token(key, "other-service", AUDIENCE, Instant.now().minusSeconds(1), Instant.now().plusSeconds(60), true);

        assertUnauthorized(() -> service(TEST_SECRET).resolveToken(token));
    }

    @Test
    void rejectsWrongAudience() {
        SecretKey key = key(TEST_SECRET);
        String token = token(key, ISSUER, "other-client", Instant.now().minusSeconds(1), Instant.now().plusSeconds(60), true);

        assertUnauthorized(() -> service(TEST_SECRET).resolveToken(token));
    }

    @Test
    void rejectsNonHs256Algorithm() {
        SecretKey key = key(TEST_SECRET);
        Instant now = Instant.now();
        String token = Jwts.builder()
                .issuer(ISSUER)
                .audience().add(AUDIENCE).and()
                .subject("42")
                .claim("user_id", 42L)
                .claim("user_account", "admin")
                .issuedAt(Date.from(now.minusSeconds(1)))
                .expiration(Date.from(now.plusSeconds(60)))
                .signWith(key, Jwts.SIG.HS384)
                .compact();

        assertUnauthorized(() -> service(TEST_SECRET).resolveToken(token));
    }

    @Test
    void rejectsTokenMissingRequiredUserClaim() {
        SecretKey key = key(TEST_SECRET);
        String token = token(key, ISSUER, AUDIENCE, Instant.now().minusSeconds(1), Instant.now().plusSeconds(60), false);

        assertUnauthorized(() -> service(TEST_SECRET).resolveToken(token));
    }

    @Test
    void rejectsBareOrMalformedAuthorizationHeader() {
        TokenService service = service(TEST_SECRET);
        String token = service.issue(42L, "admin");

        assertUnauthorized(() -> service.resolve(token));
        assertUnauthorized(() -> service.resolve("bearer " + token));
        assertUnauthorized(() -> service.resolve("Bearer "));
    }

    @Test
    void failsFastWhenSecretIsMissing() {
        JwtProperties properties = new JwtProperties("", "", ISSUER, AUDIENCE, 86400);

        assertThatThrownBy(() -> new TokenService(properties))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("not configured");
    }

    @Test
    void failsFastWhenDecodedSecretIsTooWeakWithoutLeakingIt() {
        String weakSecret = Base64.getEncoder().encodeToString("too-short".getBytes(StandardCharsets.UTF_8));
        JwtProperties properties = new JwtProperties(weakSecret, "", ISSUER, AUDIENCE, 86400);

        assertThatThrownBy(() -> new TokenService(properties))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("at least 32 bytes")
                .hasMessageNotContaining(weakSecret);
    }

    @Test
    void secretFileTakesPriorityOverEnvironmentFallback(@TempDir Path tempDir) throws Exception {
        Path secretFile = tempDir.resolve("jwt-secret");
        Files.writeString(secretFile, TEST_SECRET + System.lineSeparator(), StandardCharsets.UTF_8);
        String weakFallback = Base64.getEncoder().encodeToString("weak".getBytes(StandardCharsets.UTF_8));
        JwtProperties properties = new JwtProperties(weakFallback, secretFile.toString(), ISSUER, AUDIENCE, 60);

        TokenService service = new TokenService(properties);

        assertThat(service.resolveToken(service.issue(7L, "operator")))
                .isEqualTo(new TokenService.TokenUser(7L, "operator"));
    }

    private static TokenService service(String secret) {
        return new TokenService(new JwtProperties(secret, "", ISSUER, AUDIENCE, 86400));
    }

    private static SecretKey key(String encodedSecret) {
        return Keys.hmacShaKeyFor(Base64.getDecoder().decode(encodedSecret));
    }

    private static String token(SecretKey key, String issuer, String audience, Instant issuedAt, Instant expiration, boolean includeUserId) {
        JwtBuilder builder = Jwts.builder()
                .issuer(issuer)
                .audience().add(audience).and()
                .subject("42")
                .claim("user_account", "admin")
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiration));
        if (includeUserId) {
            builder.claim("user_id", 42L);
        }
        return builder.signWith(key, Jwts.SIG.HS256).compact();
    }

    private static void assertUnauthorized(Runnable action) {
        assertThatThrownBy(action::run)
                .isInstanceOf(ApiException.class)
                .extracting(ex -> ((ApiException) ex).getStatus())
                .isEqualTo(401);
    }
}
