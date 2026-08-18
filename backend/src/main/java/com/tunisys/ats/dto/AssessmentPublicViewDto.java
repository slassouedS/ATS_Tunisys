package com.tunisys.ats.dto;

import java.util.List;

public record AssessmentPublicViewDto(
        Long assessmentId,
        String type,
        boolean alreadyCompleted,
        List<AssessmentQuestionDto> questions
) {}
