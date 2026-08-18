package com.tunisys.ats.service;
import com.tunisys.ats.domain.Application;
import com.tunisys.ats.domain.ApplicationStageHistory;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.ApplicationStageUpdateRequest;
import com.tunisys.ats.repository.ApplicationRepository;
import com.tunisys.ats.repository.ApplicationStageHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;
import java.util.Set;
/**
 * Gestion du pipeline de candidature — implemente la State Machine du workflow CDC
 * (Etapes 6 a 10). Empeche les transitions invalides (ex: RECEIVED -> HIRED directement).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ApplicationService {
    private final ApplicationRepository applicationRepository;
    private final ApplicationStageHistoryRepository stageHistoryRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final AuditService auditService;
    // Transitions autorisees par etape (state machine du workflow CDC)
    private static final Map<String, Set<String>> ALLOWED_TRANSITIONS = Map.ofEntries(
            Map.entry("RECEIVED", Set.of("SCORED", "REJECTED")),
            Map.entry("SCORED", Set.of("SHORTLISTED", "REJECTED")),
            Map.entry("SHORTLISTED", Set.of("ASSESSMENT_SENT", "REJECTED")),
            Map.entry("ASSESSMENT_SENT", Set.of("ASSESSMENT_DONE", "REJECTED")),
            Map.entry("ASSESSMENT_DONE", Set.of("RH_INTERVIEW", "REJECTED")),
            Map.entry("RH_INTERVIEW", Set.of("TECH_INTERVIEW", "REJECTED")),
            Map.entry("TECH_INTERVIEW", Set.of("FINAL_REVIEW", "REJECTED")),
            Map.entry("FINAL_REVIEW", Set.of("HIRED", "REJECTED"))
    );
    public List<Application> findByOffer(Long offerId) {
        return applicationRepository.findByOfferIdOrderByAiScoreDesc(offerId);
    }
    public List<Application> findByRecruiter(Long recruiterId) {
        return applicationRepository.findByAssignedRecruiterId(recruiterId);
    }
    public List<Application> findByTechnical(Long technicalId) {
        return applicationRepository.findByAssignedTechnicalId(technicalId);
    }
    public Application changeStage(User actor, Long applicationId, ApplicationStageUpdateRequest req) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Candidature introuvable"));
        String from = app.getCurrentStage();
        String to = req.newStage();
        Set<String> allowed = ALLOWED_TRANSITIONS.getOrDefault(from, Set.of());
        if (!allowed.contains(to)) {
            throw new IllegalStateException(
                    "Transition invalide : " + from + " -> " + to + " (autorisees : " + allowed + ")");
        }
        app.setCurrentStage(to);
        if ("HIRED".equals(to) || "REJECTED".equals(to)) {
            app.setFinalDecision(to);
            app.setDecisionBy(actor);
            app.setDecisionAt(java.time.LocalDateTime.now());
        }
        app = applicationRepository.save(app);
        stageHistoryRepository.save(ApplicationStageHistory.builder()
                .application(app)
                .fromStage(from)
                .toStage(to)
                .changedBy(actor)
                .comment(req.comment())
                .build());
        auditService.log(actor, "APPLICATION_STAGE_CHANGED", "Application", app.getId(),
                from + " -> " + to);
        safeSend("stage-changed", Map.of(
                "applicationId", app.getId(), "from", from, "to", to
        ));
        return app;
    }

    /** Envoi Kafka "best effort" — voir CandidateService.safeSend() pour le rationnel complet :
     *  un changement d'etape ne doit jamais echouer a cause de Kafka indisponible. */
    private void safeSend(String topic, Map<String, Object> payload) {
        try {
            kafkaTemplate.send(topic, payload);
        } catch (Exception e) {
            log.warn("Kafka indisponible, event '{}' non publie : {}", topic, e.getMessage());
        }
    }
}
