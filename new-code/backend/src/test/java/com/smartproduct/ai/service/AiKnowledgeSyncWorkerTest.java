package com.smartproduct.ai.service;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class AiKnowledgeSyncWorkerTest {

    @Test
    void appliesExponentialBackoff() {
        Duration base = Duration.ofSeconds(30);

        assertThat(AiKnowledgeSyncWorker.retryDelay(0, base)).isEqualTo(Duration.ofSeconds(30));
        assertThat(AiKnowledgeSyncWorker.retryDelay(1, base)).isEqualTo(Duration.ofMinutes(1));
        assertThat(AiKnowledgeSyncWorker.retryDelay(3, base)).isEqualTo(Duration.ofMinutes(4));
    }

    @Test
    void capsRetryDelayAtOneHourAndUsesSafeDefault() {
        assertThat(AiKnowledgeSyncWorker.retryDelay(20, Duration.ofMinutes(10))).isEqualTo(Duration.ofHours(1));
        assertThat(AiKnowledgeSyncWorker.retryDelay(null, Duration.ZERO)).isEqualTo(Duration.ofSeconds(30));
    }
}
