package com.tunisys.ats.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;

import java.util.Map;

public record TechnicalEvaluationRequest(
        @NotEmpty Map<String, Integer> ratings,
        String pointsForts,
        String pointsAmelioration,
        String niveauPropose,
        @NotBlank @Pattern(regexp = "GO|NO_GO") String decision
) {}
