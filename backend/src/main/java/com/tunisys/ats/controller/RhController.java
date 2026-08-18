package com.tunisys.ats.controller;

import com.tunisys.ats.domain.Application;
import com.tunisys.ats.domain.Interview;
import com.tunisys.ats.domain.InterviewSlot;
import com.tunisys.ats.domain.JobOffer;
import com.tunisys.ats.domain.RecruitmentDemand;
import com.tunisys.ats.domain.TechnicalEvaluation;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.DemandValidationRequest;
import com.tunisys.ats.dto.OfferCreateRequest;
import com.tunisys.ats.dto.ProposeSlotsRequest;
import com.tunisys.ats.repository.ApplicationRepository;
import com.tunisys.ats.service.ApplicationService;
import com.tunisys.ats.service.DemandService;
import com.tunisys.ats.service.InterviewService;
import com.tunisys.ats.service.OfferService;
import com.tunisys.ats.service.TechnicalEvaluationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

/** Endpoints Responsable RH : validation des demandes, publication des offres,
 *  pipeline global, decisions finales — Etape 9 du CDC. */
@RestController
@RequestMapping("/api/rh")
@RequiredArgsConstructor
public class RhController {

    private final DemandService demandService;
    private final OfferService offerService;
    private final ApplicationService applicationService;
    private final ApplicationRepository applicationRepository;
    private final InterviewService interviewService;
    private final TechnicalEvaluationService technicalEvaluationService;

    @GetMapping("/demands/pending")
    public List<RecruitmentDemand> pendingDemands() {
        return demandService.findPending();
    }

    /** Demandes validees, disponibles pour la creation d'une offre (Etape 3). */
    @GetMapping("/demands/validated")
    public List<RecruitmentDemand> validatedDemands() {
        return demandService.findValidated();
    }

    @PutMapping("/demands/{id}/validate")
    public RecruitmentDemand validateDemand(@AuthenticationPrincipal User rh,
                                             @PathVariable Long id,
                                             @Valid @RequestBody DemandValidationRequest request) {
        return demandService.validate(rh, id, request);
    }

    @PostMapping("/offers")
    public JobOffer createOffer(@AuthenticationPrincipal User rh,
                                 @Valid @RequestBody OfferCreateRequest request) {
        return offerService.create(rh, request);
    }

    @PutMapping("/offers/{id}/publish")
    public JobOffer publishOffer(@AuthenticationPrincipal User rh, @PathVariable Long id) {
        return offerService.publish(rh, id);
    }

    /** Toutes les offres (brouillons + publiees) — vue de gestion RH. */
    @GetMapping("/offers")
    public List<JobOffer> allOffers() {
        return offerService.findAll();
    }

    @GetMapping("/pipeline/{offerId}")
    public Object pipeline(@PathVariable Long offerId) {
        return applicationService.findByOffer(offerId);
    }

    /** Vue Kanban globale (toutes offres confondues) — Module 6/8/10. */
    @GetMapping("/pipeline")
    public List<Application> globalPipeline() {
        return applicationRepository.findAll();
    }

    /** Candidatures arrivees en revue finale, en attente de la decision RH. */
    @GetMapping("/applications/final-review")
    public List<Application> finalReviewApplications() {
        return applicationRepository.findByCurrentStage("FINAL_REVIEW");
    }

    /** Historique des entretiens (RH, technique, et final le cas echeant) d'une
     *  candidature — permet d'afficher les avis GO/NO-GO reels dans la synthese
     *  de decision finale, au lieu de placeholders. */
    @GetMapping("/applications/{id}/interviews")
    public List<Interview> interviews(@PathVariable Long id) {
        return interviewService.listForApplication(id);
    }

    /** Entretien final optionnel (Etape 9) : la Responsable RH peut, si elle le
     *  souhaite, planifier un dernier echange avec le candidat avant de statuer
     *  sur l'embauche. Ne change pas l'etape (deja en FINAL_REVIEW) ; sert
     *  uniquement a la logistique du rendez-vous. La decision reste prise via
     *  /rh (voir ApplicationService.changeStage HIRED/REJECTED, appele par le
     *  frontend directement). */
    @PostMapping("/applications/{id}/propose-slots")
    public List<InterviewSlot> proposeFinalSlots(@AuthenticationPrincipal User rh,
                                                  @PathVariable Long id,
                                                  @Valid @RequestBody ProposeSlotsRequest request) {
        return interviewService.proposeSlots(rh, id, request.slotIds(), request.interviewType());
    }

    @PostMapping("/agenda/slots")
    public InterviewSlot createSlot(@AuthenticationPrincipal User rh,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end,
                                     @RequestParam(defaultValue = "VISIO") String mode,
                                     @RequestParam(required = false) String location) {
        return interviewService.createSlot(rh, start, end, mode, location);
    }

    @GetMapping("/agenda/slots")
    public List<InterviewSlot> mySlots(@AuthenticationPrincipal User rh) {
        return interviewService.listAvailableSlotsForInterviewer(rh.getId());
    }

    @GetMapping("/agenda/slots/proposable")
    public List<InterviewSlot> myProposableSlots(@AuthenticationPrincipal User rh) {
        return interviewService.listProposableSlotsForInterviewer(rh.getId());
    }

    /** Grille d'evaluation technique detaillee soumise par le Manager — lecture
     *  seule cote RH, pour consolider la decision finale (Etape 9 du CDC). */
    @GetMapping("/applications/{id}/technical-evaluation")
    public TechnicalEvaluation getTechnicalEvaluation(@PathVariable Long id) {
        return technicalEvaluationService.findByApplication(id).orElse(null);
    }
}
