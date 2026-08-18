package com.tunisys.ats.dto;

import java.math.BigDecimal;

/** Réponse du microservice IA (ia-service) après scoring CV vs offre. */
public record ScoreResultDto(
        BigDecimal score,
        String explanation
) {}
