package com.tunisys.ats.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatbotRequest(
        @NotBlank String message,
        String context
) {}
