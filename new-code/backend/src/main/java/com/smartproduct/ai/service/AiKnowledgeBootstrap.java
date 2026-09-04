package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.smartproduct.ai.config.AiProperties;
import com.smartproduct.entity.AiKnowledgeDocumentEntity;
import com.smartproduct.entity.KnowledgeEntity;
import com.smartproduct.mapper.AiKnowledgeDocumentMapper;
import com.smartproduct.mapper.KnowledgeMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Queues the first AI knowledge rebuild after the application is ready.
 *
 * The business knowledge remains the source of truth. This bootstrap only
 * creates asynchronous replica tasks; it never deletes business data and it
 * never needs a browser-supplied scene or dataset id.
 */
@Component
public class AiKnowledgeBootstrap {
    private static final Logger LOG = LoggerFactory.getLogger(AiKnowledgeBootstrap.class);

    private final AiProperties properties;
    private final KnowledgeMapper knowledge;
    private final AiKnowledgeDocumentMapper documents;
    private final AiKnowledgeSyncTaskService tasks;
    private final AtomicBoolean started = new AtomicBoolean(false);

    public AiKnowledgeBootstrap(AiProperties properties,
                                KnowledgeMapper knowledge,
                                AiKnowledgeDocumentMapper documents,
                                AiKnowledgeSyncTaskService tasks) {
        this.properties = properties;
        this.knowledge = knowledge;
        this.documents = documents;
        this.tasks = tasks;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void queueInitialRebuild() {
        if (!properties.isEnabled()
                || !properties.getSync().isBootstrapEnabled()
                || !started.compareAndSet(false, true)) {
            return;
        }

        try {
            // A non-empty replica means this installation has already been
            // initialized. Subsequent changes are enqueued by the normal
            // knowledge write/version services.
            if (documents.selectCount(new QueryWrapper<AiKnowledgeDocumentEntity>()) > 0) {
                return;
            }

            List<KnowledgeEntity> rows = knowledge.selectList(new QueryWrapper<KnowledgeEntity>()
                    .select("id")
                    .eq("del", 0)
                    .orderByAsc("id"));
            int queued = 0;
            for (KnowledgeEntity row : rows) {
                if (row != null && row.id != null && tasks.enqueueRebuild(row.id)) {
                    queued++;
                }
            }
            LOG.info("AI initial knowledge rebuild queued: knowledgeCount={}, queuedTaskCount={}",
                    rows.size(), queued);
        } catch (Exception ex) {
            // AI must not prevent the main business application from starting.
            // The scheduled worker and the next restart can retry initialization
            // after the migration/RAGFlow configuration is corrected.
            LOG.warn("AI initial knowledge rebuild was not queued; main business remains available: {}",
                    safeMessage(ex));
        }
    }

    private static String safeMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return ex.getClass().getSimpleName();
        }
        return message.length() <= 500 ? message : message.substring(0, 500);
    }
}
