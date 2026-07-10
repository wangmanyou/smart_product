package com.smartproduct.infrastructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security.jwt")
public record JwtProperties(
        String secret,
        String secretFile,
        String issuer,
        String audience,
        long ttlSeconds
) {
}
