package com.smartproduct.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@ConfigurationProperties(prefix = "app.ai")
public class AiProperties {
    private boolean enabled;
    private Ragflow ragflow = new Ragflow();
    private Llm llm = new Llm();
    private Retrieval retrieval = new Retrieval();
    private Sync sync = new Sync();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public Ragflow getRagflow() {
        return ragflow;
    }

    public void setRagflow(Ragflow ragflow) {
        this.ragflow = ragflow;
    }

    public Llm getLlm() {
        return llm;
    }

    public void setLlm(Llm llm) {
        this.llm = llm;
    }

    public Sync getSync() {
        return sync;
    }

    public void setSync(Sync sync) {
        this.sync = sync;
    }

    public Retrieval getRetrieval() {
        return retrieval;
    }

    public void setRetrieval(Retrieval retrieval) {
        this.retrieval = retrieval;
    }

    public static class Ragflow {
        private String baseUrl = "http://127.0.0.1:9380";
        private String apiKey;
        private Duration connectTimeout = Duration.ofSeconds(5);
        private Duration readTimeout = Duration.ofSeconds(60);

        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public Duration getConnectTimeout() { return connectTimeout; }
        public void setConnectTimeout(Duration connectTimeout) { this.connectTimeout = connectTimeout; }
        public Duration getReadTimeout() { return readTimeout; }
        public void setReadTimeout(Duration readTimeout) { this.readTimeout = readTimeout; }
    }

    public static class Llm {
        private String baseUrl;
        private String apiKey;
        private String model;
        private double temperature = 0.1d;
        private Duration connectTimeout = Duration.ofSeconds(5);
        private Duration readTimeout = Duration.ofSeconds(90);
        private int maxOutputTokens = 1200;

        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
        public String getApiKey() { return apiKey; }
        public void setApiKey(String apiKey) { this.apiKey = apiKey; }
        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public double getTemperature() { return temperature; }
        public void setTemperature(double temperature) { this.temperature = temperature; }
        public Duration getConnectTimeout() { return connectTimeout; }
        public void setConnectTimeout(Duration connectTimeout) { this.connectTimeout = connectTimeout; }
        public Duration getReadTimeout() { return readTimeout; }
        public void setReadTimeout(Duration readTimeout) { this.readTimeout = readTimeout; }
        public int getMaxOutputTokens() { return maxOutputTokens; }
        public void setMaxOutputTokens(int maxOutputTokens) { this.maxOutputTokens = maxOutputTokens; }
    }

    public static class Sync {
        private long workerDelayMs = 5000;
        private int batchSize = 5;
        private int maxRetries = 6;
        private Duration parsePollDelay = Duration.ofSeconds(10);
        private Duration retryBaseDelay = Duration.ofSeconds(30);
        private Duration staleProcessingTimeout = Duration.ofMinutes(5);
        private boolean bootstrapEnabled = true;

        public long getWorkerDelayMs() { return workerDelayMs; }
        public void setWorkerDelayMs(long workerDelayMs) { this.workerDelayMs = workerDelayMs; }
        public int getBatchSize() { return batchSize; }
        public void setBatchSize(int batchSize) { this.batchSize = batchSize; }
        public int getMaxRetries() { return maxRetries; }
        public void setMaxRetries(int maxRetries) { this.maxRetries = maxRetries; }
        public Duration getParsePollDelay() { return parsePollDelay; }
        public void setParsePollDelay(Duration parsePollDelay) { this.parsePollDelay = parsePollDelay; }
        public Duration getRetryBaseDelay() { return retryBaseDelay; }
        public void setRetryBaseDelay(Duration retryBaseDelay) { this.retryBaseDelay = retryBaseDelay; }
        public Duration getStaleProcessingTimeout() { return staleProcessingTimeout; }
        public void setStaleProcessingTimeout(Duration staleProcessingTimeout) { this.staleProcessingTimeout = staleProcessingTimeout; }
        public boolean isBootstrapEnabled() { return bootstrapEnabled; }
        public void setBootstrapEnabled(boolean bootstrapEnabled) { this.bootstrapEnabled = bootstrapEnabled; }
    }
    public static class Retrieval {
        private int topK = 8;
        private int candidateTopK = 64;
        private int maxContextChars = 16000;
        private int historyMessageLimit = 8;
        private double similarityThreshold = 0.25d;

        public int getTopK() { return topK; }
        public void setTopK(int topK) { this.topK = topK; }
        public int getCandidateTopK() { return candidateTopK; }
        public void setCandidateTopK(int candidateTopK) { this.candidateTopK = candidateTopK; }
        public int getMaxContextChars() { return maxContextChars; }
        public void setMaxContextChars(int maxContextChars) { this.maxContextChars = maxContextChars; }
        public int getHistoryMessageLimit() { return historyMessageLimit; }
        public void setHistoryMessageLimit(int historyMessageLimit) { this.historyMessageLimit = historyMessageLimit; }
        public double getSimilarityThreshold() { return similarityThreshold; }
        public void setSimilarityThreshold(double similarityThreshold) { this.similarityThreshold = similarityThreshold; }
    }
}



