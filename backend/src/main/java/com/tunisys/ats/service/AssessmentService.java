package com.tunisys.ats.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tunisys.ats.domain.Application;
import com.tunisys.ats.domain.Assessment;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.*;
import com.tunisys.ats.repository.ApplicationRepository;
import com.tunisys.ats.repository.ApplicationStageHistoryRepository;
import com.tunisys.ats.repository.AssessmentRepository;
import com.tunisys.ats.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Module 7 — E-Assessment (tests techniques / personnalite envoyes au candidat). */
@Service
@RequiredArgsConstructor
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationStageHistoryRepository stageHistoryRepository;
    private final JwtService jwtService;
    private final NotificationService notificationService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Value("${app.public-base-url}")
    private String publicBaseUrl;

    private static final int TOKEN_VALIDITY_DAYS = 7;

    public Assessment send(User actor, Long applicationId, String type) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Candidature introuvable"));

        Assessment assessment = Assessment.builder()
                .application(application)
                .type(type)
                .sentAt(LocalDateTime.now())
                .passingScore(new BigDecimal("50.00"))
                .build();
        assessment = assessmentRepository.save(assessment);

        // Fait avancer le pipeline vers ASSESSMENT_SENT (transition valide depuis
        // SHORTLISTED) pour que la soumission du candidat puisse ensuite auto-avancer
        // vers ASSESSMENT_DONE (voir submit()).
        if ("SHORTLISTED".equals(application.getCurrentStage())) {
            String from = application.getCurrentStage();
            application.setCurrentStage("ASSESSMENT_SENT");
            applicationRepository.save(application);
            stageHistoryRepository.save(com.tunisys.ats.domain.ApplicationStageHistory.builder()
                    .application(application)
                    .fromStage(from)
                    .toStage("ASSESSMENT_SENT")
                    .changedBy(actor)
                    .comment("Test " + type + " envoye")
                    .build());
        }

        String token = jwtService.generateAssessmentToken(assessment.getId(), TOKEN_VALIDITY_DAYS);
        String assessmentUrl = publicBaseUrl + "/portail/assessment/" + token;

        notificationService.notify("CANDIDATE", application.getCandidate().getId(), "EMAIL",
                "ASSESSMENT_INVITATION", Map.of("assessmentUrl", assessmentUrl));

        auditService.log(actor, "ASSESSMENT_SENT", "Assessment", assessment.getId(),
                "Type: " + type + " pour candidature #" + applicationId);

        return assessment;
    }

    public AssessmentPublicViewDto getPublicView(String token) {
        Long assessmentId = validateAndExtractAssessmentId(token);
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new IllegalArgumentException("Test introuvable ou lien expire"));

        List<AssessmentQuestionDto> questions = AssessmentQuestionBank.forType(assessment.getType()).stream()
                .map(q -> new AssessmentQuestionDto(q.id(), q.text(), q.options()))
                .toList();

        return new AssessmentPublicViewDto(
                assessment.getId(),
                assessment.getType(),
                assessment.getCompletedAt() != null,
                questions
        );
    }

    public Assessment submit(String token, Map<String, Integer> answers) {
        Long assessmentId = validateAndExtractAssessmentId(token);
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new IllegalArgumentException("Test introuvable ou lien expire"));

        if (assessment.getCompletedAt() != null) {
            throw new IllegalStateException("Ce test a deja ete complete.");
        }

        double score = AssessmentQuestionBank.score(assessment.getType(), answers);
        assessment.setScore(BigDecimal.valueOf(score));
        assessment.setCompletedAt(LocalDateTime.now());
        try {
            assessment.setResultJson(objectMapper.writeValueAsString(answers));
        } catch (Exception e) {
            assessment.setResultJson("{}");
        }
        assessment = assessmentRepository.save(assessment);

        // Auto-avancement du pipeline si l'etape actuelle attendait ce test.
        // Si le score est sous le seuil requis, le process s'arrete ici
        // automatiquement (rejet) plutot que de laisser le candidat en
        // suspens en attente d'un entretien qui n'aura pas lieu.
        Application application = assessment.getApplication();
        if ("ASSESSMENT_SENT".equals(application.getCurrentStage())) {
            boolean passed = assessment.getPassingScore() == null
                    || assessment.getScore().compareTo(assessment.getPassingScore()) >= 0;
            application.setCurrentStage(passed ? "ASSESSMENT_DONE" : "REJECTED");
            applicationRepository.save(application);
            stageHistoryRepository.save(com.tunisys.ats.domain.ApplicationStageHistory.builder()
                    .application(application)
                    .fromStage("ASSESSMENT_SENT")
                    .toStage(passed ? "ASSESSMENT_DONE" : "REJECTED")
                    .comment(passed ? "Test complete avec succes" : "Score sous le seuil requis (" + assessment.getScore() + "% < " + assessment.getPassingScore() + "%)")
                    .build());
        }

        return assessment;
    }

    private Long validateAndExtractAssessmentId(String token) {
        if (!jwtService.isTokenValid(token)) {
            throw new IllegalArgumentException("Lien invalide ou expire");
        }
        String scope = jwtService.extractClaim(token, c -> c.get("scope", String.class));
        if (!"ASSESSMENT_ACCESS".equals(scope)) {
            throw new IllegalArgumentException("Lien invalide");
        }
        return jwtService.extractClaim(token, c -> c.get("assessmentId", Long.class).longValue());
    }
}
