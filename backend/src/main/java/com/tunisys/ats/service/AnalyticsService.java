package com.tunisys.ats.service;

import com.tunisys.ats.dto.AnalyticsOverviewDto;
import com.tunisys.ats.repository.ApplicationRepository;
import com.tunisys.ats.repository.JobOfferRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Module 10 — Tableau de bord & analytics (KPIs RH). */
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final JobOfferRepository jobOfferRepository;
    private final ApplicationRepository applicationRepository;

    public AnalyticsOverviewDto getOverview() {
        Map<String, Long> offersByStatus = new LinkedHashMap<>();
        for (var row : jobOfferRepository.countByStatus()) {
            offersByStatus.put(row.getStatus(), row.getTotal());
        }
        long totalOffers = offersByStatus.values().stream().mapToLong(Long::longValue).sum();

        Map<String, Long> applicationsByStage = new LinkedHashMap<>();
        for (var row : applicationRepository.countByStage()) {
            applicationsByStage.put(row.getStage(), row.getTotal());
        }
        long totalApplications = applicationsByStage.values().stream().mapToLong(Long::longValue).sum();

        Double avgTimeToHire = applicationRepository.averageTimeToHireDays();

        List<AnalyticsOverviewDto.RecruiterStat> topRecruiters = applicationRepository.topRecruitersByHires()
                .stream()
                .map(r -> new AnalyticsOverviewDto.RecruiterStat(
                        r.getFirstName() + " " + r.getLastName(), r.getTotal()))
                .toList();

        return new AnalyticsOverviewDto(
                totalOffers, offersByStatus,
                totalApplications, applicationsByStage,
                avgTimeToHire != null ? Math.round(avgTimeToHire * 10) / 10.0 : null,
                topRecruiters
        );
    }
}
