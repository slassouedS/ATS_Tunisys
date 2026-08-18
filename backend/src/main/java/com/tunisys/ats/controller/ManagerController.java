package com.tunisys.ats.controller;

import com.tunisys.ats.domain.Application;
import com.tunisys.ats.domain.Department;
import com.tunisys.ats.domain.RecruitmentDemand;
import com.tunisys.ats.domain.TechnicalEvaluation;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.DemandCreateRequest;
import com.tunisys.ats.dto.TechnicalEvaluationRequest;
import com.tunisys.ats.repository.DepartmentRepository;
import com.tunisys.ats.service.ApplicationService;
import com.tunisys.ats.service.DemandService;
import com.tunisys.ats.service.TechnicalEvaluationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/manager")
@RequiredArgsConstructor
public class ManagerController {

    private final DemandService demandService;
    private final DepartmentRepository departmentRepository;
    private final ApplicationService applicationService;
    private final TechnicalEvaluationService technicalEvaluationService;

    @PostMapping("/demands")
    public RecruitmentDemand createDemand(@AuthenticationPrincipal User manager,
                                           @Valid @RequestBody DemandCreateRequest request) {
        return demandService.create(manager, request);
    }

    @GetMapping("/demands")
    public List<RecruitmentDemand> myDemands(@AuthenticationPrincipal User manager) {
        return demandService.findByManager(manager.getId());
    }

    /** Liste des departements reels, pour le selecteur du wizard "Nouvelle demande"
     *  (evite toute saisie manuelle d'un ID inexistant). */
    @GetMapping("/departments")
    public List<Department> departments() {
        return departmentRepository.findAll();
    }

    /** Candidatures d'une offre issue d'une de ses demandes — permet au tableau de
     *  bord Manager d'afficher le vrai statut du pipeline (candidatures recues,
     *  entretiens en cours, decision) au lieu d'etapes figees. */
    @GetMapping("/applications/offer/{offerId}")
    public List<Application> applicationsForOffer(@PathVariable Long offerId) {
        return applicationService.findByOffer(offerId);
    }

    /** Soumission de la grille d'evaluation technique detaillee (Etape 8 du CDC).
     *  Fait avancer le pipeline via le meme mecanisme que le verdict simple. */
    @PostMapping("/applications/{id}/technical-evaluation")
    public TechnicalEvaluation submitTechnicalEvaluation(@AuthenticationPrincipal User manager,
                                                           @PathVariable Long id,
                                                           @Valid @RequestBody TechnicalEvaluationRequest request) {
        return technicalEvaluationService.submit(manager, id, request);
    }

    /** Grille deja soumise pour cette candidature, si elle existe (permet de
     *  reafficher en lecture seule apres soumission). */
    @GetMapping("/applications/{id}/technical-evaluation")
    public TechnicalEvaluation getTechnicalEvaluation(@PathVariable Long id) {
        return technicalEvaluationService.findByApplication(id).orElse(null);
    }
}
