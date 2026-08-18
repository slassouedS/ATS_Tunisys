package com.tunisys.ats.dto;

import java.util.List;
import java.util.Map;

public record AnalyticsOverviewDto(
        long totalOffers,
        Map<String, Long> offersByStatus,
        long totalApplications,
        Map<String, Long> applicationsByStage,
        Double averageTimeToHireDays,
        List<RecruiterStat> topRecruiters
) {
    public record RecruiterStat(String recruiterName, long hires) {}
}
