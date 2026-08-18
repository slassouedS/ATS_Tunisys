package com.tunisys.ats.controller;

import com.tunisys.ats.dto.AnalyticsOverviewDto;
import com.tunisys.ats.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Module 10 — Analytics (RH uniquement, cf. matrice de permissions). */
@RestController
@RequestMapping("/api/rh/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/overview")
    public AnalyticsOverviewDto overview() {
        return analyticsService.getOverview();
    }
}
