package com.tunisys.ats.dto;

import java.math.BigDecimal;
import java.util.List;

public record AiConfigDto(
        BigDecimal defaultAiScoreThreshold,
        String llmModel,
        List<String> availableModels,
        String embeddingsEngine
) {}
