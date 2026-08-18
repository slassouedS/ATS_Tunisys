package com.tunisys.ats.controller;

import com.tunisys.ats.domain.Application;
import com.tunisys.ats.domain.Assessment;
import com.tunisys.ats.domain.Interview;
import com.tunisys.ats.domain.InterviewSlot;
import com.tunisys.ats.domain.JobOffer;
import com.tunisys.ats.dto.AssessmentPublicViewDto;
import com.tunisys.ats.dto.AssessmentSubmitRequest;
import com.tunisys.ats.dto.CandidateApplyRequest;
import com.tunisys.ats.repository.ApplicationRepository;
import com.tunisys.ats.repository.CandidateRepository;
import com.tunisys.ats.service.AssessmentService;
import com.tunisys.ats.service.CandidateService;
import com.tunisys.ats.service.InterviewService;
import com.tunisys.ats.service.OfferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * Portail carriere public (careers.tunisys.com) — Module 2.
 * Aucune authentification requise, conformement au CDC (candidat sans compte
 * pour consulter/postuler ; reservation d'entretien et E-Assessment via liens
 * a token unique).
 */
@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicController {

    private final OfferService offerService;
    private final CandidateService candidateService;
    private final InterviewService interviewService;
    private final AssessmentService assessmentService;
    private final CandidateRepository candidateRepository;
    private final ApplicationRepository applicationRepository;

    @GetMapping("/offers")
    public List<JobOffer> listPublishedOffers() {
        return offerService.findPublished();
    }

    @GetMapping("/offers/{id}")
    public JobOffer getOffer(@PathVariable Long id) {
        return offerService.findById(id);
    }

    @PostMapping(value = "/applications", consumes = "multipart/form-data")
    public Application apply(@Valid @ModelAttribute CandidateApplyRequest request,
                              @RequestParam(value = "cv", required = false) MultipartFile cv) throws IOException {
        return candidateService.apply(request, cv);
    }

    /** Creneaux proposes specifiquement a cette candidature par le RH/Technique,
     *  en attente du choix du candidat (planification dirigee). */
    @GetMapping("/applications/{id}/proposed-slots")
    public List<InterviewSlot> proposedSlots(@PathVariable Long id) {
        return interviewService.listProposedSlotsForApplication(id);
    }

    @PostMapping("/interviews/book/{slotId}")
    public Object bookSlot(@PathVariable Long slotId,
                            @RequestParam Long applicationId,
                            @RequestParam(defaultValue = "RH") String interviewType) {
        return interviewService.bookSlot(applicationId, slotId, interviewType);
    }

    /** Entretien(s) deja reserve(s) pour une candidature — permet a l'espace candidat
     *  d'afficher la date confirmee au lieu du formulaire de reservation. */
    @GetMapping("/applications/{id}/interviews")
    public List<Interview> applicationInterviews(@PathVariable Long id) {
        return interviewService.listForApplication(id);
    }

    @GetMapping("/assessments/{token}")
    public AssessmentPublicViewDto getAssessment(@PathVariable String token) {
        return assessmentService.getPublicView(token);
    }

    @PostMapping("/assessments/{token}/submit")
    public Assessment submitAssessment(@PathVariable String token,
                                        @Valid @RequestBody AssessmentSubmitRequest request) {
        return assessmentService.submit(token, request.answers());
    }

    /** Module 2 (Mon espace) — suivi de candidature par email (pas de compte candidat). */
    @GetMapping("/track")
    public List<Application> trackByEmail(@RequestParam String email) {
        return candidateRepository.findByEmail(email)
                .map(c -> applicationRepository.findByCandidateId(c.getId()))
                .orElse(List.of());
    }
}
