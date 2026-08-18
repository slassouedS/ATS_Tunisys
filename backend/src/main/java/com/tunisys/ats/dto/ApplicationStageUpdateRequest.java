package com.tunisys.ats.dto;

import jakarta.validation.constraints.NotBlank;

public record ApplicationStageUpdateRequest(
        @NotBlank String newStage,
        String comment
) {}
