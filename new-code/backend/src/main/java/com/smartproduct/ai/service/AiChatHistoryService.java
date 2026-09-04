package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartproduct.ai.client.LlmClient;
import com.smartproduct.entity.AiChatMessageEntity;
import com.smartproduct.entity.AiChatSessionEntity;
import com.smartproduct.mapper.AiChatMessageMapper;
import com.smartproduct.mapper.AiChatSessionMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import com.smartproduct.shared.exception.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiChatHistoryService {
    private final AiChatSessionMapper sessions;
    private final AiChatMessageMapper messages;
    private final CurrentUserService currentUsers;
    private final ObjectMapper json;

    public AiChatHistoryService(AiChatSessionMapper sessions, AiChatMessageMapper messages,
                                CurrentUserService currentUsers, ObjectMapper json) {
        this.sessions = sessions;
        this.messages = messages;
        this.currentUsers = currentUsers;
        this.json = json;
    }

    public AiChatSessionEntity requireOwnedSession(Long sessionId, Long userId) {
        if (sessionId == null) {
            return null;
        }
        AiChatSessionEntity session = sessions.selectById(sessionId);
        if (session == null || !userId.equals(session.userId)) {
            throw new ApiException(HttpStatus.NOT_FOUND.value(), "问答会话不存在");
        }
        return session;
    }

    public List<LlmClient.ChatTurn> recentTurns(Long sessionId, Long userId, int limit) {
        if (sessionId == null) {
            return List.of();
        }
        requireOwnedSession(sessionId, userId);
        int safeLimit = Math.max(0, Math.min(limit, 20));
        if (safeLimit == 0) {
            return List.of();
        }
        List<AiChatMessageEntity> rows = messages.selectList(new QueryWrapper<AiChatMessageEntity>()
                .eq("session_id", sessionId)
                .eq("user_id", userId)
                .in("role", List.of("USER", "ASSISTANT"))
                .orderByDesc("id")
                .last("limit " + safeLimit));
        List<LlmClient.ChatTurn> result = new ArrayList<>();
        for (AiChatMessageEntity row : rows) {
            result.add(new LlmClient.ChatTurn(row.role, row.content));
        }
        Collections.reverse(result);
        return result;
    }

    @Transactional
    public PersistedExchange saveExchange(Long sessionId, Long userId, String question, String answer,
                                           List<?> references, String modelName, long latencyMs) {
        LocalDateTime now = LocalDateTime.now();
        AiChatSessionEntity session;
        if (sessionId == null) {
            session = new AiChatSessionEntity();
            session.userId = userId;
            session.title = title(question);
            session.createAt = now;
            session.updateAt = now;
            sessions.insert(session);
        } else {
            session = requireOwnedSession(sessionId, userId);
            sessions.update(new UpdateWrapper<AiChatSessionEntity>()
                    .eq("id", session.id)
                    .eq("user_id", userId)
                    .set("update_at", now));
        }

        AiChatMessageEntity userMessage = new AiChatMessageEntity();
        userMessage.sessionId = session.id;
        userMessage.userId = userId;
        userMessage.role = "USER";
        userMessage.content = question;
        userMessage.createAt = now;
        messages.insert(userMessage);

        AiChatMessageEntity assistantMessage = new AiChatMessageEntity();
        assistantMessage.sessionId = session.id;
        assistantMessage.userId = userId;
        assistantMessage.role = "ASSISTANT";
        assistantMessage.content = answer;
        assistantMessage.referenceJson = writeJson(references == null ? List.of() : references);
        assistantMessage.modelName = blankToNull(modelName);
        assistantMessage.latencyMs = Math.max(0L, latencyMs);
        assistantMessage.createAt = LocalDateTime.now();
        messages.insert(assistantMessage);
        return new PersistedExchange(session.id, userMessage.id, assistantMessage.id);
    }

    public List<Map<String, Object>> listOwnSessions() {
        CurrentUser user = requireHistoryPermission();
        return sessions.selectList(new QueryWrapper<AiChatSessionEntity>()
                        .eq("user_id", user.userId())
                        .orderByDesc("update_at")
                        .last("limit 100"))
                .stream()
                .map(row -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", row.id);
                    item.put("title", row.title);
                    item.put("createAt", row.createAt);
                    item.put("updateAt", row.updateAt);
                    return item;
                })
                .toList();
    }

    @Transactional
    public void deleteOwnSession(Long sessionId) {
        CurrentUser user = requireHistoryPermission();
        requireOwnedSession(sessionId, user.userId());
        messages.delete(new QueryWrapper<AiChatMessageEntity>()
                .eq("session_id", sessionId)
                .eq("user_id", user.userId()));
        sessions.delete(new QueryWrapper<AiChatSessionEntity>()
                .eq("id", sessionId)
                .eq("user_id", user.userId()));
    }

    public List<Map<String, Object>> listOwnMessages(Long sessionId) {
        CurrentUser user = requireHistoryPermission();
        requireOwnedSession(sessionId, user.userId());
        return messages.selectList(new QueryWrapper<AiChatMessageEntity>()
                        .eq("session_id", sessionId)
                        .eq("user_id", user.userId())
                        .orderByAsc("id"))
                .stream()
                .map(row -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("id", row.id);
                    item.put("role", row.role);
                    item.put("content", row.content);
                    item.put("references", readJson(row.referenceJson));
                    item.put("modelName", row.modelName);
                    item.put("latencyMs", row.latencyMs);
                    item.put("feedback", row.feedback);
                    item.put("createAt", row.createAt);
                    return item;
                })
                .toList();
    }

    private CurrentUser requireHistoryPermission() {
        CurrentUser user = currentUsers.current();
        if (!user.hasPermission(PermissionCodes.AI_CHAT_HISTORY)) {
            throw new ApiException(HttpStatus.FORBIDDEN.value(), "没有查看问答历史的权限");
        }
        return user;
    }

    private String writeJson(Object value) {
        try {
            return json.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("问答引用序列化失败", ex);
        }
    }

    private Object readJson(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        try {
            return json.readValue(value, Object.class);
        } catch (JsonProcessingException ignored) {
            return List.of();
        }
    }

    private static String title(String question) {
        String value = question == null ? "新会话" : question.trim().replaceAll("\\s+", " ");
        if (value.isBlank()) {
            return "新会话";
        }
        return value.length() <= 60 ? value : value.substring(0, 60);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public record PersistedExchange(Long sessionId, Long userMessageId, Long assistantMessageId) {
    }
}
