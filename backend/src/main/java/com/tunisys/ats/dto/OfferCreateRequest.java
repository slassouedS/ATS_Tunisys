package com.tunisys.ats.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record OfferCreateRequest(
        @NotNull Long demandId,
        @NotBlank String title,
        @NotBlank String description,
        String requirements,
        String location,
        String contractType,
        BigDecimal aiScoreThreshold
) {}
