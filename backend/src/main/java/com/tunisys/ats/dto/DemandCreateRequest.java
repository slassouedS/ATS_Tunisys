package com.tunisys.ats.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record DemandCreateRequest(
        @NotBlank String title,
        @NotNull Long departmentId,
        String profileDesc,
        BigDecimal budget,
        String urgency
) {}
