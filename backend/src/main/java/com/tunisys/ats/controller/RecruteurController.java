package com.tunisys.ats.controller;

import com.tunisys.ats.domain.Application;
import com.tunisys.ats.domain.Assessment;
import com.tunisys.ats.domain.Interview;
import com.tunisys.ats.domain.InterviewSlot;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.ApplicationStageUpdateRequest;
import com.tunisys.ats.dto.AssessmentSendRequest;
import com.tunisys.ats.dto.InterviewOutcomeRequest;
import com.tunisys.ats.dto.ProposeSlotsRequest;
import com.tunisys.ats.repository.ApplicationRepository;
import com.tunisys.ats.repository.AssessmentRepository;
import com.tunisys.ats.service.ApplicationService;
import com.tunisys.ats.service.AssessmentService;
import com.tunisys.ats.service.InterviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/** Endpoints Charge de Recrutement : candidatures, pipeline, agenda/entretiens, E-Assessment. */
@RestController
@RequestMapping("/api/recruteur")
@RequiredArgsConstructor
public class RecruteurController {

    private final ApplicationService applicationService;
    private final InterviewService interviewService;
    private final AssessmentService assessmentService;
    private final ApplicationRepository applicationRepository;
    private final AssessmentRepository assessmentRepository;

    /** Toutes les candidatures actives (pas de notion d'assignation automatique
     *  de recruteur dans le workflow actuel — chaque recruteur voit l'ensemble
     *  du pipeline, a l'image de la vue RH). */
    @GetMapping("/applications")
    public List<Application> myApplications(@AuthenticationPrincipal User recruiter) {
        return applicationRepository.findAll();
    }

    /** Resultat du test technique (score QCM) pour une candidature. */
    @GetMapping("/applications/{id}/assessments")
    public List<Assessment> assessmentResults(@PathVariable Long id) {
        return assessmentRepository.findByApplicationId(id);
    }

    /** Tous les tests (envoyes/completes), pour affichage groupe cote UI. */
    @GetMapping("/assessments")
    public List<Assessment> allAssessments() {
        return assessmentRepository.findAll();
    }

    @GetMapping("/applications/offer/{offerId}")
    public List<Application> applicationsForOffer(@PathVariable Long offerId) {
        return applicationService.findByOffer(offerId);
    }

    @PutMapping("/applications/{id}/stage")
    public Application changeStage(@AuthenticationPrincipal User recruiter,
                                    @PathVariable Long id,
                                    @Valid @RequestBody ApplicationStageUpdateRequest request) {
        return applicationService.changeStage(recruiter, id, request);
    }

    /** Historique des entretiens (RH + technique) d'une candidature — pour afficher
     *  la date/heure du creneau reserve cote UI. */
    @GetMapping("/applications/{id}/interviews")
    public List<Interview> interviews(@PathVariable Long id) {
        return interviewService.listForApplication(id);
    }

    /** Verdict de l'entretien RH (Etape 7 du CDC) : GO -> TECH_INTERVIEW,
     *  NO_GO -> REJECTED. */
    @PostMapping("/applications/{id}/interview-outcome")
    public Interview submitInterviewOutcome(@AuthenticationPrincipal User recruiter,
                                             @PathVariable Long id,
                                             @Valid @RequestBody InterviewOutcomeRequest request) {
        return interviewService.submitOutcome(recruiter, id, "RH", request.outcome(), request.report());
    }

    /** Proposition dirigee de creneaux a un candidat precis ("Envoyer invitation"),
     *  parmi les disponibilites propres du recruteur. */
    @PostMapping("/applications/{id}/propose-slots")
    public List<InterviewSlot> proposeSlots(@AuthenticationPrincipal User recruiter,
                                             @PathVariable Long id,
                                             @Valid @RequestBody ProposeSlotsRequest request) {
        return interviewService.proposeSlots(recruiter, id, request.slotIds(), request.interviewType());
    }

    @PostMapping("/agenda/slots")
    public InterviewSlot createSlot(@AuthenticationPrincipal User recruiter,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
                                     @RequestParam(defaultValue = "VISIO") String mode,
                                     @RequestParam(required = false) String location) {
        return interviewService.createSlot(recruiter, start, end, mode, location);
    }

    /** Tous les creneaux du recruteur (proposes ou non), pour affichage de sa grille. */
    @GetMapping("/agenda/slots")
    public List<InterviewSlot> mySlots(@AuthenticationPrincipal User recruiter) {
        return interviewService.listAvailableSlotsForInterviewer(recruiter.getId());
    }

    /** Creneaux du recruteur libres ET pas encore proposes a quelqu'un — c'est
     *  parmi ceux-la qu'il choisit lesquels proposer a un candidat donne. */
    @GetMapping("/agenda/slots/proposable")
    public List<InterviewSlot> myProposableSlots(@AuthenticationPrincipal User recruiter) {
        return interviewService.listProposableSlotsForInterviewer(recruiter.getId());
    }

    @PostMapping("/applications/{id}/assessment")
    public Assessment sendAssessment(@AuthenticationPrincipal User recruiter,
                                      @PathVariable Long id,
                                      @Valid @RequestBody AssessmentSendRequest request) {
        return assessmentService.send(recruiter, id, request.type());
    }
}
