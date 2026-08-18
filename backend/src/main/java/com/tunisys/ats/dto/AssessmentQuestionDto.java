package com.tunisys.ats.dto;

import java.util.List;

/** Question sans la reponse correcte -- c'est ce qui est expose au candidat. */
public record AssessmentQuestionDto(String id, String text, List<String> options) {}
