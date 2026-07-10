package com.smartproduct.service;

import com.smartproduct.shared.exception.ApiException;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DashboardServiceTest {
    @Test
    void dateBoundariesCoverTheCompleteEndDateAndBuildAnEqualPreviousPeriod() {
        DashboardService.DashboardRange range = DashboardService.resolveRange(
                "2026-07-01",
                "2026-07-10",
                "DAY"
        );

        assertThat(range.start()).isEqualTo(LocalDateTime.of(2026, 7, 1, 0, 0));
        assertThat(range.endExclusive()).isEqualTo(LocalDateTime.of(2026, 7, 11, 0, 0));
        assertThat(range.previousStart()).isEqualTo(LocalDateTime.of(2026, 6, 21, 0, 0));
        assertThat(range.granularity()).isEqualTo(DashboardService.Granularity.DAY);
        assertThat(range.bucketStarts()).hasSize(10);
    }

    @Test
    void automaticallyUsesWeeklyBucketsForMediumRanges() {
        DashboardService.DashboardRange range = DashboardService.resolveRange(
                "2026-01-01",
                "2026-04-01",
                null
        );

        assertThat(range.granularity()).isEqualTo(DashboardService.Granularity.WEEK);
        assertThat(range.bucketStarts()).isNotEmpty();
    }

    @Test
    void rejectsReversedAndExcessivelyLargeRanges() {
        assertThatThrownBy(() -> DashboardService.resolveRange("2026-07-10", "2026-07-01", "DAY"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("开始时间");

        assertThatThrownBy(() -> DashboardService.resolveRange("2024-01-01", "2026-07-10", "MONTH"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("731 天");
    }

    @Test
    void rejectsUnknownGranularity() {
        assertThatThrownBy(() -> DashboardService.resolveRange("2026-07-01", "2026-07-10", "HOUR"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("DAY、WEEK、MONTH");
    }
}
