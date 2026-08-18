package com.tunisys.ats.dto;

import jakarta.validation.constraints.NotBlank;

public record AssessmentSendRequest(
        @NotBlank String type   // TECHNICAL_QCM ou PERSONALITY
) {}
