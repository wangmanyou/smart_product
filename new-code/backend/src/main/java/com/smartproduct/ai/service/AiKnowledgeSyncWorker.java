package com.smartproduct.ai.service;

import com.smartproduct.ai.config.AiProperties;
import com.smartproduct.entity.AiKnowledgeSyncTaskEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

@Component
public class AiKnowledgeSyncWorker {
    private static final Logger LOG = LoggerFactory.getLogger(AiKnowledgeSyncWorker.class);
    private static final Duration MAX_RETRY_DELAY = Duration.ofHours(1);

    private final AiProperties properties;
    private final AiKnowledgeSyncTaskClaimService claims;
    private final AiKnowledgeSyncTaskService tasks;
    private final AiKnowledgeSyncProcessor processor;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public AiKnowledgeSyncWorker(AiProperties properties,
                                 AiKnowledgeSyncTaskClaimService claims,
                                 AiKnowledgeSyncTaskService tasks,
                                 AiKnowledgeSyncProcessor processor) {
        this.properties = properties;
        this.claims = claims;
        this.tasks = tasks;
        this.processor = processor;
    }

    @Scheduled(fixedDelayString = "${app.ai.sync.worker-delay-ms:5000}")
    public void runOnce() {
        if (!properties.isEnabled() || !running.compareAndSet(false, true)) {
            return;
        }
        try {
            tasks.recoverStaleProcessing(properties.getSync().getStaleProcessingTimeout());
            int batchSize = Math.max(1, properties.getSync().getBatchSize());
            for (int i = 0; i < batchSize; i++) {
                Optional<AiKnowledgeSyncTaskClaimService.ClaimedTask> claimed = claims.claimNext();
                if (claimed.isEmpty()) {
                    break;
                }
                process(claimed.orElseThrow().task());
            }
        } finally {
            running.set(false);
        }
    }

    private void process(AiKnowledgeSyncTaskEntity task) {
        try {
            AiKnowledgeSyncProcessor.ProcessingResult result = processor.process(task);
            if (result == AiKnowledgeSyncProcessor.ProcessingResult.PARSING) {
                tasks.markParsing(task.id, properties.getSync().getParsePollDelay());
            } else {
                tasks.markSuccess(task.id);
            }
        } catch (Exception ex) {
            Duration delay = retryDelay(task.retryCount, properties.getSync().getRetryBaseDelay());
            tasks.markFailureOrRetry(task, errorMessage(ex), delay, properties.getSync().getMaxRetries());
            LOG.warn("AI knowledge sync task {} failed and will follow retry policy: {}", task.id, errorMessage(ex));
        }
    }

    static Duration retryDelay(Integer retryCount, Duration baseDelay) {
        Duration base = baseDelay == null || baseDelay.isNegative() || baseDelay.isZero()
                ? Duration.ofSeconds(30)
                : baseDelay;
        int exponent = Math.min(Math.max(retryCount == null ? 0 : retryCount, 0), 10);
        long multiplier = 1L << exponent;
        Duration result;
        try {
            result = base.multipliedBy(multiplier);
        } catch (ArithmeticException ignored) {
            result = MAX_RETRY_DELAY;
        }
        return result.compareTo(MAX_RETRY_DELAY) > 0 ? MAX_RETRY_DELAY : result;
    }

    private static String errorMessage(Exception ex) {
        Throwable current = ex;
        while (current.getCause() != null && current.getCause() != current) {
            current = current.getCause();
        }
        String message = current.getMessage();
        if (message == null || message.isBlank()) {
            message = current.getClass().getSimpleName();
        }
        return message.length() <= 2000 ? message : message.substring(0, 2000);
    }
}
