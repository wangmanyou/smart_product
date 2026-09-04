package com.smartproduct.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.ai.client.LlmClient;
import com.smartproduct.ai.client.RagflowClient;
import com.smartproduct.ai.config.AiProperties;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AiChatServiceTest {
    private final ObjectMapper json = new ObjectMapper();
    private AiPermissionService permissions;
    private RagflowClient ragflow;
    private LlmClient llm;
    private AiChatHistoryService history;
    private CurrentUserService currentUsers;
    private AiChatService service;

    @BeforeEach
    void setUp() {
        AiProperties properties = new AiProperties();
        properties.setEnabled(true);
        properties.getRetrieval().setTopK(8);
        properties.getRetrieval().setMaxContextChars(16000);
        permissions = mock(AiPermissionService.class);
        ragflow = mock(RagflowClient.class);
        llm = mock(LlmClient.class);
        history = mock(AiChatHistoryService.class);
        currentUsers = mock(CurrentUserService.class);
        when(currentUsers.current()).thenReturn(user());
        when(history.recentTurns(any(), eq(7L), any(Integer.class))).thenReturn(List.of());
        when(history.saveExchange(any(), eq(7L), any(), any(), any(), any(), anyLong()))
                .thenReturn(new AiChatHistoryService.PersistedExchange(31L, 41L, 42L));
        service = new AiChatService(properties, permissions, ragflow, llm, history, currentUsers);
    }

    @Test
    void sendsOnlyAuthorizedDatasetChunksToLlmAndReturnsReferences() throws Exception {
        when(permissions.resolve(List.of(8L))).thenReturn(scope());
        JsonNode retrieval = json.readTree("""
                {"chunks":[
                  {"id":"chunk-1","dataset_id":"dataset-a","document_id":"doc-1","document_keyword":"产品手册","content":"<p>授权内容</p>","similarity":0.91},
                  {"id":"chunk-2","dataset_id":"dataset-rogue","document_id":"doc-2","document_keyword":"越权资料","content":"不应出现","similarity":0.99}
                ]}
                """);
        when(ragflow.retrieve("如何操作？", Set.of("dataset-a"))).thenReturn(retrieval);
        when(llm.answer(eq("如何操作？"), any(), any())).thenReturn("请按手册操作 [1]");
        when(llm.modelName()).thenReturn("test-model");

        AiChatService.AskResponse response = service.ask(null, "如何操作？", List.of(8L));

        assertThat(response.answer()).isEqualTo("请按手册操作 [1]");
        assertThat(response.references()).hasSize(1);
        assertThat(response.references().getFirst().sceneTemplateId()).isEqualTo(8L);
        assertThat(response.references().getFirst().title()).isEqualTo("产品手册");
        assertThat(response.references().getFirst().contentPreview()).isEqualTo("授权内容");
        ArgumentCaptor<List<LlmClient.SourceChunk>> chunks = sourceChunksCaptor();
        verify(llm).answer(eq("如何操作？"), chunks.capture(), any());
        assertThat(chunks.getValue()).extracting(LlmClient.SourceChunk::content).containsExactly("授权内容");
    }

    @Test
    void fallsBackToLlmWhenRetrievalHasNoEvidence() throws Exception {
        when(permissions.resolve(null)).thenReturn(scope());
        when(ragflow.retrieve("未知问题", Set.of("dataset-a")))
                .thenReturn(json.readTree("{\"chunks\":[]}"));
        when(llm.answerWithoutKnowledge(eq("未知问题"), any())).thenReturn("这是一个通用回答");
        when(llm.modelName()).thenReturn("test-model");

        AiChatService.AskResponse response = service.ask(null, "未知问题", null);

        assertThat(response.answer()).isEqualTo("这是一个通用回答");
        assertThat(response.references()).isEmpty();
        assertThat(response.modelName()).isEqualTo("test-model");
        verify(llm).answerWithoutKnowledge(eq("未知问题"), any());
        verify(llm, never()).answer(any(), any(), any());
    }

    @Test
    void rejectsWhenNoAuthorizedSceneHasDatasetBinding() {
        when(permissions.resolve(null)).thenReturn(new AiPermissionService.ResolvedScope(
                Set.of(8L), Map.of(), Set.of(), Set.of(8L)
        ));

        assertThatThrownBy(() -> service.ask(null, "问题", null))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("尚未绑定");
        verify(ragflow, never()).retrieve(any(), any());
    }

    private static AiPermissionService.ResolvedScope scope() {
        Map<Long, String> byScene = new LinkedHashMap<>();
        byScene.put(8L, "dataset-a");
        return new AiPermissionService.ResolvedScope(Set.of(8L), byScene, Set.of("dataset-a"), Set.of());
    }

    private static CurrentUser user() {
        return new CurrentUser(
                7L, "tester", Set.of(1L), false,
                Set.of(PermissionCodes.AI_CHAT), Set.of(8L), List.of(),
                Map.of(PermissionCodes.AI_CHAT, Set.of(8L)), Map.of()
        );
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private static ArgumentCaptor<List<LlmClient.SourceChunk>> sourceChunksCaptor() {
        return (ArgumentCaptor) ArgumentCaptor.forClass(List.class);
    }
}

