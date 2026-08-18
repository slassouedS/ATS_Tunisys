package com.tunisys.ats.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** Verdict d'un entretien (RH ou Technique) — Etapes 7 et 8 du workflow CDC. */
public record InterviewOutcomeRequest(
        @NotBlank
        @Pattern(regexp = "GO|NO_GO", message = "outcome doit etre GO ou NO_GO")
        String outcome,
        String report
) {}
