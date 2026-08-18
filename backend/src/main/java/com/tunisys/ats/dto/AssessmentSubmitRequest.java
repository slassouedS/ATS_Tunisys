package com.tunisys.ats.dto;

import jakarta.validation.constraints.NotNull;
import java.util.Map;

public record AssessmentSubmitRequest(
        @NotNull Map<String, Integer> answers
) {}
