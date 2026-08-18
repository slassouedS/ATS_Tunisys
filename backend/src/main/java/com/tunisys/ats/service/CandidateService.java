package com.tunisys.ats.service;

import com.tunisys.ats.domain.*;
import com.tunisys.ats.dto.CandidateApplyRequest;
import com.tunisys.ats.dto.ScoreResultDto;
import com.tunisys.ats.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Module 4 (Parsing CV) + Module 6 (Scoring) — parcours de candidature (Étapes 4 et 5 du workflow).
 * Le fichier brut est stocké côté Mongo (via mongoRefId — l'intégration Mongo GridFS réelle
 * est à brancher dans un CvStorageService dédié, ici simplifiée pour rester lisible).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CandidateService {

    private final CandidateRepository candidateRepository;
    private final CvDocumentRepository cvDocumentRepository;
    private final JobOfferRepository jobOfferRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationStageHistoryRepository stageHistoryRepository;
    private final ScoringClient scoringClient;
    private final NotificationService notificationService;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ElasticsearchIndexService elasticsearchIndexService;

    public Application apply(CandidateApplyRequest req, MultipartFile cvFile) throws IOException {
        JobOffer offer = jobOfferRepository.findById(req.offerId())
                .orElseThrow(() -> new IllegalArgumentException("Offre introuvable"));
        if (!"PUBLISHED".equals(offer.getStatus())) {
            throw new IllegalStateException("Cette offre n'accepte plus de candidatures");
        }

        Candidate candidate = candidateRepository.findByEmail(req.email())
                .orElseGet(() -> candidateRepository.save(Candidate.builder()
                        .email(req.email())
                        .firstName(req.firstName())
                        .lastName(req.lastName())
                        .phone(req.phone())
                        .gdprConsentAt(Boolean.TRUE.equals(req.gdprConsent()) ? LocalDateTime.now() : null)
                        .dataRetentionUntil(java.time.LocalDate.now().plusYears(2))
                        .build()));

        if (!Boolean.TRUE.equals(req.gdprConsent()) && candidate.getGdprConsentAt() == null) {
            throw new IllegalStateException("Le consentement RGPD est requis pour déposer une candidature");
        }

        if (applicationRepository.findByCandidateIdAndOfferId(candidate.getId(), offer.getId()).isPresent()) {
            throw new IllegalStateException("Vous avez déjà postulé à cette offre — consultez \"Mon espace\" pour suivre son avancement.");
        }

        CvDocument cvDoc = null;
        String cvText = "";
        if (cvFile != null && !cvFile.isEmpty()) {
            String mongoRef = UUID.randomUUID().toString();
            // TODO production : écrire réellement le binaire dans MongoDB GridFS via mongoRef
            cvDoc = cvDocumentRepository.save(CvDocument.builder()
                    .candidate(candidate)
                    .mongoRefId(mongoRef)
                    .fileName(cvFile.getOriginalFilename())
                    .fileFormat(getExtension(cvFile.getOriginalFilename()))
                    .parsingStatus("PENDING")
                    .build());

            cvText = scoringClient.parseCv(cvFile.getBytes(), cvFile.getOriginalFilename());
            cvDoc.setParsingStatus(cvText.isBlank() ? "FAILED" : "DONE");
            cvDoc.setCvText(cvText);
            cvDocumentRepository.save(cvDoc);
        }

        Application application = Application.builder()
                .candidate(candidate)
                .offer(offer)
                .cvDocument(cvDoc)
                .currentStage("RECEIVED")
                .build();
        application = applicationRepository.save(application);
        recordStageChange(application, null, "RECEIVED", null, "Candidature créée");

        // Scoring IA (Module 6) — appel synchrone volontaire en V1 pour rester simple ;
        // à faire évoluer en asynchrone (Kafka consumer dédié) si le volume grossit.
        if (!cvText.isBlank()) {
            String offerText = offer.getTitle() + "\n" + offer.getDescription() + "\n" + offer.getRequirements();
            ScoreResultDto scoreResult = scoringClient.scoreCandidate(cvText, offerText);
            application.setAiScore(scoreResult.score());
            application.setAiScoreExplanation(scoreResult.explanation());
            application.setCurrentStage("SCORED");
            applicationRepository.save(application);
            recordStageChange(application, "RECEIVED", "SCORED", null,
                    "Score IA calculé : " + scoreResult.score());

            safeSend("score-computed", Map.of(
                    "applicationId", application.getId(),
                    "score", scoreResult.score()
            ));
        }

        safeSend("application-created", Map.of(
                "applicationId", application.getId(),
                "offerId", offer.getId(),
                "candidateId", candidate.getId()
        ));

        notificationService.notify("CANDIDATE", candidate.getId(), "EMAIL", "APPLICATION_RECEIVED",
                Map.of("offerTitle", offer.getTitle()));

        // Module 5 — CVthèque : indexation pour recherche full-text/semantique par les recruteurs.
        // Echec silencieux si Elasticsearch est indisponible (voir ElasticsearchIndexService).
        elasticsearchIndexService.indexCandidateApplication(application.getId(), Map.of(
                "candidateId", candidate.getId(),
                "candidateName", candidate.getFirstName() + " " + candidate.getLastName(),
                "candidateEmail", candidate.getEmail(),
                "offerId", offer.getId(),
                "offerTitle", offer.getTitle(),
                "cvText", cvText,
                "aiScore", application.getAiScore() != null ? application.getAiScore() : 0,
                "currentStage", application.getCurrentStage(),
                "appliedAt", application.getCreatedAt().toString()
        ));

        return application;
    }

    /**
     * Envoi Kafka "best effort" : si le broker est indisponible (ex. mode natif sans Docker,
     * ou tout simplement le service Kafka arrêté), on logue un avertissement mais on ne fait
     * JAMAIS échouer la candidature pour autant. La création de la candidature en base et le
     * calcul du score IA restent la source de vérité ; Kafka ne sert qu'à notifier d'autres
     * services en temps réel (dashboard, etc.) et n'est pas critique pour la réponse HTTP.
     */
    private void safeSend(String topic, Map<String, Object> payload) {
        try {
            kafkaTemplate.send(topic, payload);
        } catch (Exception e) {
            log.warn("Kafka indisponible, event '{}' non publié : {}", topic, e.getMessage());
        }
    }

    private void recordStageChange(Application app, String from, String to, User by, String comment) {
        stageHistoryRepository.save(ApplicationStageHistory.builder()
                .application(app)
                .fromStage(from)
                .toStage(to)
                .changedBy(by)
                .comment(comment)
                .build());
    }

    private String getExtension(String fileName) {
        if (fileName == null || !fileName.contains(".")) return "";
        return fileName.substring(fileName.lastIndexOf('.') + 1).toUpperCase();
    }
}
