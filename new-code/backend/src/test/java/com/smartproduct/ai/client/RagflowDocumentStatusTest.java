package com.smartproduct.ai.client;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RagflowDocumentStatusTest {

    @Test
    void recognizesNumericAndTextualSuccessStates() {
        assertThat(status("3", 0.8d).succeeded()).isTrue();
        assertThat(status("DONE", 0.2d).succeeded()).isTrue();
        assertThat(status("1", 1.0d).succeeded()).isTrue();
    }

    @Test
    void recognizesNumericAndTextualFailureStates() {
        assertThat(status("2", 0.4d).failed()).isTrue();
        assertThat(status("4", 0.4d).failed()).isTrue();
        assertThat(status("FAILED", 0.4d).failed()).isTrue();
        assertThat(status("1", -1d).failed()).isTrue();
    }

    @Test
    void distinguishesUnstartedFromRunning() {
        assertThat(status("0", 0d).unstarted()).isTrue();
        assertThat(status("PENDING", 0d).unstarted()).isTrue();
        assertThat(status("1", 0.5d).unstarted()).isFalse();
        assertThat(status("1", 0.5d).failed()).isFalse();
        assertThat(status("1", 0.5d).succeeded()).isFalse();
    }

    private static RagflowClient.DocumentStatus status(String run, double progress) {
        return new RagflowClient.DocumentStatus("doc-1", run, progress, "", 0, 0);
    }
}
