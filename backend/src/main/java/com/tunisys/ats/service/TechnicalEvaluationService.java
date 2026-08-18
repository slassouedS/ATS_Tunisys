package com.tunisys.ats.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tunisys.ats.domain.Application;
import com.tunisys.ats.domain.TechnicalEvaluation;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.TechnicalEvaluationRequest;
import com.tunisys.ats.repository.ApplicationRepository;
import com.tunisys.ats.repository.TechnicalEvaluationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Optional;

/** Module 8 — Grille d'evaluation technique detaillee (Etape 8 du CDC). */
@Service
@RequiredArgsConstructor
public class TechnicalEvaluationService {

    private final TechnicalEvaluationRepository technicalEvaluationRepository;
    private final ApplicationRepository applicationRepository;
    private final InterviewService interviewService;
    private final ObjectMapper objectMapper;

    public Optional<TechnicalEvaluation> findByApplication(Long applicationId) {
        return technicalEvaluationRepository.findByApplicationId(applicationId);
    }

    /** Soumet la grille detaillee ET le verdict GO/NO-GO associe. Reutilise
     *  InterviewService.submitOutcome() pour la transition d'etape du pipeline
     *  (TECH_INTERVIEW -> FINAL_REVIEW si GO, REJECTED si NO_GO) — la grille
     *  n'ajoute qu'une couche de detail structure au-dessus du meme mecanisme,
     *  donc aucune double-logique de state machine a maintenir. */
    public TechnicalEvaluation submit(User actor, Long applicationId, TechnicalEvaluationRequest request) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Candidature introuvable"));

        double weightedScore = TechnicalEvaluationGrid.computeWeightedScore(request.ratings());

        String ratingsJson;
        try {
            ratingsJson = objectMapper.writeValueAsString(request.ratings());
        } catch (Exception e) {
            ratingsJson = "{}";
        }

        TechnicalEvaluation evaluation = TechnicalEvaluation.builder()
                .application(application)
                .ratingsJson(ratingsJson)
                .weightedScore(BigDecimal.valueOf(weightedScore))
                .pointsForts(request.pointsForts())
                .pointsAmelioration(request.pointsAmelioration())
                .niveauPropose(request.niveauPropose())
                .decision(request.decision())
                .submittedBy(actor)
                .build();
        evaluation = technicalEvaluationRepository.save(evaluation);

        String report = "Note technique globale : " + weightedScore + "/100."
                + (request.pointsForts() != null && !request.pointsForts().isBlank()
                    ? " Points forts : " + request.pointsForts() : "")
                + (request.pointsAmelioration() != null && !request.pointsAmelioration().isBlank()
                    ? " | Points d'attention : " + request.pointsAmelioration() : "");
        interviewService.submitOutcome(actor, applicationId, "TECHNIQUE", request.decision(), report);

        return evaluation;
    }
}
