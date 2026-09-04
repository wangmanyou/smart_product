package com.smartproduct.ai.client;

import com.smartproduct.ai.config.AiProperties;
import com.smartproduct.shared.exception.ApiException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class LlmClientTest {

    @Test
    void parsesStringContentAndBuildsGroundedPrompt() {
        Fixture fixture = fixture();
        fixture.server.expect(requestTo("http://llm.test/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().string(containsString("用户问题")))
                .andExpect(content().string(containsString("[1] 产品手册")))
                .andExpect(content().string(containsString("只允许使用的授权内容")))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"content":"请按步骤操作 [1]"}}]}
                        """, MediaType.APPLICATION_JSON));

        String answer = fixture.client.answer(
                "如何操作？",
                List.of(new LlmClient.SourceChunk("产品手册", "只允许使用的授权内容")),
                List.of()
        );

        assertThat(answer).isEqualTo("请按步骤操作 [1]");
        fixture.server.verify();
    }

    @Test
    void parsesContentBlockArray() {
        Fixture fixture = fixture();
        fixture.server.expect(requestTo("http://llm.test/v1/chat/completions"))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"content":[
                          {"type":"text","text":"第一段"},
                          {"type":"text","text":"第二段"}
                        ]}}]}
                        """, MediaType.APPLICATION_JSON));

        String answer = fixture.client.answer("问题", List.of(), List.of());

        assertThat(answer).isEqualTo("第一段第二段");
        fixture.server.verify();
    }

    @Test
    void rejectsWhenAiOrModelIsNotConfigured() {
        AiProperties properties = new AiProperties();
        LlmClient client = new LlmClient(properties, RestClient.create("http://llm.test"));

        assertThatThrownBy(() -> client.answer("问题", List.of(), List.of()))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(503);
                    assertThat(ex.getMessage()).contains("尚未启用");
                });

        properties.setEnabled(true);
        assertThatThrownBy(() -> client.answer("问题", List.of(), List.of()))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(503);
                    assertThat(ex.getMessage()).contains("尚未配置");
                });
    }

    @Test
    void rejectsEmptyModelResponse() {
        Fixture fixture = fixture();
        fixture.server.expect(requestTo("http://llm.test/v1/chat/completions"))
                .andRespond(withSuccess("{\"choices\":[{\"message\":{\"content\":\"  \"}}]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> fixture.client.answer("问题", List.of(), List.of()))
                .isInstanceOfSatisfying(ApiException.class, ex -> {
                    assertThat(ex.getStatus()).isEqualTo(502);
                    assertThat(ex.getMessage()).contains("未返回有效回答");
                });
        fixture.server.verify();
    }

    private static Fixture fixture() {
        AiProperties properties = new AiProperties();
        properties.setEnabled(true);
        properties.getLlm().setBaseUrl("http://llm.test/v1");
        properties.getLlm().setApiKey("test-key");
        properties.getLlm().setModel("test-model");
        RestClient.Builder builder = RestClient.builder().baseUrl(properties.getLlm().getBaseUrl());
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        return new Fixture(new LlmClient(properties, builder.build()), server);
    }

    private record Fixture(LlmClient client, MockRestServiceServer server) {
    }
}
