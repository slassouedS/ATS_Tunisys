package com.tunisys.ats.controller;

import com.tunisys.ats.domain.Application;
import com.tunisys.ats.domain.Interview;
import com.tunisys.ats.domain.InterviewSlot;
import com.tunisys.ats.domain.TechnicalEvaluation;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.ApplicationStageUpdateRequest;
import com.tunisys.ats.dto.InterviewOutcomeRequest;
import com.tunisys.ats.dto.ProposeSlotsRequest;
import com.tunisys.ats.dto.TechnicalEvaluationRequest;
import com.tunisys.ats.repository.ApplicationRepository;
import com.tunisys.ats.service.ApplicationService;
import com.tunisys.ats.service.InterviewService;
import com.tunisys.ats.service.TechnicalEvaluationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/** Endpoints Responsable Technique : shortlists, agenda d'entretiens, avis d'expertise. */
@RestController
@RequestMapping("/api/technique")
@RequiredArgsConstructor
public class TechniqueController {

    private final ApplicationService applicationService;
    private final ApplicationRepository applicationRepository;
    private final InterviewService interviewService;
    private final TechnicalEvaluationService technicalEvaluationService;

    /** Toutes les candidatures (pas d'assignation automatique de technicien
     *  dans le workflow actuel) — le frontend filtre par etape TECH_INTERVIEW. */
    @GetMapping("/shortlists")
    public List<Application> assignedShortlists(@AuthenticationPrincipal User technical) {
        return applicationRepository.findAll();
    }

    @PutMapping("/applications/{id}/stage")
    public Application submitTechnicalOutcome(@AuthenticationPrincipal User technical,
                                               @PathVariable Long id,
                                               @Valid @RequestBody ApplicationStageUpdateRequest request) {
        return applicationService.changeStage(technical, id, request);
    }

    /** Historique des entretiens (RH + technique) d'une candidature — pour afficher
     *  la date/heure du creneau reserve cote UI. */
    @GetMapping("/applications/{id}/interviews")
    public List<Interview> interviews(@PathVariable Long id) {
        return interviewService.listForApplication(id);
    }

    /** Verdict de l'entretien technique (Etape 8 du CDC) : GO -> FINAL_REVIEW,
     *  NO_GO -> REJECTED. */
    @PostMapping("/applications/{id}/interview-outcome")
    public Interview submitInterviewOutcome(@AuthenticationPrincipal User technical,
                                             @PathVariable Long id,
                                             @Valid @RequestBody InterviewOutcomeRequest request) {
        return interviewService.submitOutcome(technical, id, "TECHNIQUE", request.outcome(), request.report());
    }

    /** Proposition dirigee de creneaux a un candidat precis ("Envoyer invitation"),
     *  parmi les disponibilites propres du responsable technique. */
    @PostMapping("/applications/{id}/propose-slots")
    public List<InterviewSlot> proposeSlots(@AuthenticationPrincipal User technical,
                                             @PathVariable Long id,
                                             @Valid @RequestBody ProposeSlotsRequest request) {
        return interviewService.proposeSlots(technical, id, request.slotIds(), request.interviewType());
    }

    /** Disponibilites du Responsable Technique pour les entretiens (memes endpoints
     *  que le module Agenda du Charge de Recrutement — cf. RecruteurController). */
    @PostMapping("/agenda/slots")
    public InterviewSlot createSlot(@AuthenticationPrincipal User technical,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
                                     @RequestParam(defaultValue = "VISIO") String mode,
                                     @RequestParam(required = false) String location) {
        return interviewService.createSlot(technical, start, end, mode, location);
    }

    /** Tous les creneaux du technicien (proposes ou non), pour affichage de sa grille. */
    @GetMapping("/agenda/slots")
    public List<InterviewSlot> mySlots(@AuthenticationPrincipal User technical) {
        return interviewService.listAvailableSlotsForInterviewer(technical.getId());
    }

    /** Creneaux du technicien libres ET pas encore proposes a quelqu'un — c'est
     *  parmi ceux-la qu'il choisit lesquels proposer a un candidat donne. */
    @GetMapping("/agenda/slots/proposable")
    public List<InterviewSlot> myProposableSlots(@AuthenticationPrincipal User technical) {
        return interviewService.listProposableSlotsForInterviewer(technical.getId());
    }

    /** Grille d'evaluation technique detaillee (Etape 8 du CDC). */
    @PostMapping("/applications/{id}/technical-evaluation")
    public TechnicalEvaluation submitTechnicalEvaluation(@AuthenticationPrincipal User technical,
                                                           @PathVariable Long id,
                                                           @Valid @RequestBody TechnicalEvaluationRequest request) {
        return technicalEvaluationService.submit(technical, id, request);
    }

    @GetMapping("/applications/{id}/technical-evaluation")
    public TechnicalEvaluation getTechnicalEvaluation(@PathVariable Long id) {
        return technicalEvaluationService.findByApplication(id).orElse(null);
    }
}
