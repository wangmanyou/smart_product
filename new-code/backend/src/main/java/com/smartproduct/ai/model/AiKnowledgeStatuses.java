package com.smartproduct.ai.model;

public final class AiKnowledgeStatuses {
    private AiKnowledgeStatuses() {
    }

    public static final String DOCUMENT_PENDING = "PENDING";
    public static final String DOCUMENT_SYNCING = "SYNCING";
    public static final String DOCUMENT_PARSING = "PARSING";
    public static final String DOCUMENT_READY = "READY";
    public static final String DOCUMENT_FAILED = "FAILED";
    public static final String DOCUMENT_DELETED = "DELETED";

    public static final String TASK_PENDING = "PENDING";
    public static final String TASK_PROCESSING = "PROCESSING";
    public static final String TASK_PARSING = "PARSING";
    public static final String TASK_SUCCESS = "SUCCESS";
    public static final String TASK_FAILED = "FAILED";

    public static final String TASK_UPSERT = "UPSERT";
    public static final String TASK_DELETE = "DELETE";
    public static final String TASK_REBUILD = "REBUILD";
    public static final String TASK_MOVE = "MOVE";

    public static final String SOURCE_MAIN = "MAIN";
    public static final String SOURCE_ATTACHMENT = "ATTACHMENT";
}
