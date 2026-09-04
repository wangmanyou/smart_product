package com.smartproduct.ai.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.smartproduct.entity.AiRagDatasetBindingEntity;
import com.smartproduct.entity.SceneTemplateEntity;
import com.smartproduct.mapper.AiRagDatasetBindingMapper;
import com.smartproduct.mapper.SceneTemplateMapper;
import com.smartproduct.security.CurrentUser;
import com.smartproduct.security.CurrentUserService;
import com.smartproduct.security.PermissionCodes;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AiPermissionServiceTest {
    private CurrentUserService currentUsers;
    private SceneTemplateMapper scenes;
    private AiRagDatasetBindingMapper bindings;
    private AiPermissionService service;

    @BeforeEach
    void setUp() {
        currentUsers = mock(CurrentUserService.class);
        scenes = mock(SceneTemplateMapper.class);
        bindings = mock(AiRagDatasetBindingMapper.class);
        service = new AiPermissionService(currentUsers, scenes, bindings);
        when(scenes.selectList(any(QueryWrapper.class))).thenReturn(List.of(scene(8L), scene(9L)));
    }

    @Test
    void ordinaryUserUsesOnlyScenesScopedToAiChatPermission() {
        when(currentUsers.current()).thenReturn(user(false, Set.of(8L, 9L), Set.of(8L)));
        when(bindings.selectList(any(QueryWrapper.class))).thenReturn(List.of(
                binding(8L, "dataset-8", "ENABLED"),
                binding(9L, "dataset-9", "ENABLED")
        ));

        AiPermissionService.ResolvedScope scope = service.resolve(null);

        assertThat(scope.sceneTemplateIds()).containsExactly(8L);
        assertThat(scope.ragflowDatasetIds()).containsExactly("dataset-8");
        assertThat(scope.ragflowDatasetIdsByScene()).containsOnlyKeys(8L);
    }

    @Test
    void requestedScenesCanNarrowButNeverExpandScope() {
        when(currentUsers.current()).thenReturn(user(false, Set.of(8L), Set.of(8L)));
        when(bindings.selectList(any(QueryWrapper.class))).thenReturn(List.of(binding(8L, "dataset-8", "ENABLED")));

        AiPermissionService.ResolvedScope scope = service.resolve(List.of(8L, 99L));

        assertThat(scope.sceneTemplateIds()).containsExactly(8L);
        assertThat(scope.ragflowDatasetIds()).containsExactly("dataset-8");
    }

    @Test
    void ignoresDisabledBindingsAndReportsUnboundScene() {
        when(currentUsers.current()).thenReturn(user(false, Set.of(8L), Set.of(8L)));
        when(bindings.selectList(any(QueryWrapper.class))).thenReturn(List.of(binding(8L, "dataset-8", "DISABLED")));

        AiPermissionService.ResolvedScope scope = service.resolve(null);

        assertThat(scope.ragflowDatasetIds()).isEmpty();
        assertThat(scope.unboundSceneTemplateIds()).containsExactly(8L);
    }

    @Test
    void administratorCanUseAllEnabledScenes() {
        when(currentUsers.current()).thenReturn(user(true, Set.of(), Set.of()));
        when(bindings.selectList(any(QueryWrapper.class))).thenReturn(List.of(
                binding(8L, "dataset-8", "ENABLED"),
                binding(9L, "dataset-9", "ENABLED")
        ));

        AiPermissionService.ResolvedScope scope = service.resolve(null);

        assertThat(scope.sceneTemplateIds()).containsExactly(8L, 9L);
        assertThat(scope.ragflowDatasetIds()).containsExactlyInAnyOrder("dataset-8", "dataset-9");
    }

    private static CurrentUser user(boolean admin, Set<Long> allScenes, Set<Long> chatScenes) {
        return new CurrentUser(
                7L, "tester", Set.of(2L), admin,
                Set.of(PermissionCodes.AI_CHAT), allScenes, List.of(),
                chatScenes.isEmpty() ? Map.of() : Map.of(PermissionCodes.AI_CHAT, chatScenes),
                Map.of()
        );
    }

    private static SceneTemplateEntity scene(Long id) {
        SceneTemplateEntity row = new SceneTemplateEntity();
        row.id = id;
        row.del = 0;
        row.isDisabled = false;
        return row;
    }

    private static AiRagDatasetBindingEntity binding(Long sceneId, String datasetId, String status) {
        AiRagDatasetBindingEntity row = new AiRagDatasetBindingEntity();
        row.sceneTemplateId = sceneId;
        row.ragflowDatasetId = datasetId;
        row.status = status;
        return row;
    }
}
