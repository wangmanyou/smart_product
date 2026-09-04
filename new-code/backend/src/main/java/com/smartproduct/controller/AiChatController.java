package com.smartproduct.controller;

import com.smartproduct.ai.service.AiChatHistoryService;
import com.smartproduct.ai.service.AiChatService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/data/ai/chat")
public class AiChatController {
    private final AiChatService chats;
    private final AiChatHistoryService history;

    public AiChatController(AiChatService chats, AiChatHistoryService history) {
        this.chats = chats;
        this.history = history;
    }

    @PostMapping("/ask")
    @PreAuthorize("hasAuthority('ai:chat')")
    public AiChatService.AskResponse ask(@RequestBody AskRequest request) {
        return chats.ask(request.sessionId(), request.question(), request.sceneTemplateIds());
    }

    @GetMapping("/session/list")
    @PreAuthorize("hasAuthority('ai:chat:history')")
    public List<Map<String, Object>> sessions() {
        return history.listOwnSessions();
    }

    @DeleteMapping("/session/{sessionId}")
    @PreAuthorize("hasAuthority('ai:chat:history')")
    public void deleteSession(@PathVariable Long sessionId) {
        history.deleteOwnSession(sessionId);
    }

    @GetMapping("/session/{sessionId}/messages")
    @PreAuthorize("hasAuthority('ai:chat:history')")
    public List<Map<String, Object>> messages(@PathVariable Long sessionId) {
        return history.listOwnMessages(sessionId);
    }

    public record AskRequest(Long sessionId, String question, List<Long> sceneTemplateIds) {
    }
}
