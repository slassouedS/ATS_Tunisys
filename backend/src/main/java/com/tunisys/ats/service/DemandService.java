package com.tunisys.ats.service;

import com.tunisys.ats.domain.Department;
import com.tunisys.ats.domain.RecruitmentDemand;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.DemandCreateRequest;
import com.tunisys.ats.dto.DemandValidationRequest;
import com.tunisys.ats.repository.DepartmentRepository;
import com.tunisys.ats.repository.RecruitmentDemandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** Module 1 — Gestion des demandes de recrutement (Étapes 1 & 2 du workflow CDC). */
@Service
@RequiredArgsConstructor
public class DemandService {

    private final RecruitmentDemandRepository demandRepository;
    private final DepartmentRepository departmentRepository;
    private final NotificationService notificationService;
    private final AuditService auditService;

    public RecruitmentDemand create(User manager, DemandCreateRequest req) {
        Department dept = departmentRepository.findById(req.departmentId())
                .orElseThrow(() -> new IllegalArgumentException("Département introuvable"));

        RecruitmentDemand demand = RecruitmentDemand.builder()
                .title(req.title())
                .department(dept)
                .requestedBy(manager)
                .profileDesc(req.profileDesc())
                .budget(req.budget())
                .urgency(req.urgency() != null ? req.urgency() : "NORMAL")
                .status("PENDING")
                .build();
        demand = demandRepository.save(demand);

        auditService.log(manager, "DEMAND_CREATED", "RecruitmentDemand", demand.getId(),
                "Nouvelle demande créée : " + demand.getTitle());

        // Notifie tous les Responsables RH (simplifié V1 : notification générique par rôle,
        // à raffiner avec la vraie liste des utilisateurs RH actifs)
        notificationService.notify("USER", manager.getId(), "EMAIL", "DEMAND_PENDING_VALIDATION",
                Map.of("demandId", demand.getId(), "title", demand.getTitle()));

        return demand;
    }

    public List<RecruitmentDemand> findPending() {
        return demandRepository.findByStatus("PENDING");
    }

    public List<RecruitmentDemand> findValidated() {
        return demandRepository.findByStatus("VALIDATED");
    }

    public List<RecruitmentDemand> findByManager(Long managerId) {
        return demandRepository.findByRequestedById(managerId);
    }

    public RecruitmentDemand validate(User rhUser, Long demandId, DemandValidationRequest req) {
        RecruitmentDemand demand = demandRepository.findById(demandId)
                .orElseThrow(() -> new IllegalArgumentException("Demande introuvable"));

        if (!"PENDING".equals(demand.getStatus())) {
            throw new IllegalStateException("Cette demande a déjà été traitée");
        }

        if (Boolean.TRUE.equals(req.approve())) {
            demand.setStatus("VALIDATED");
        } else {
            demand.setStatus("REJECTED");
            demand.setRejectionReason(req.rejectionReason());
        }
        demand.setValidatedBy(rhUser);
        demand.setValidatedAt(LocalDateTime.now());
        demand = demandRepository.save(demand);

        auditService.log(rhUser, "DEMAND_" + demand.getStatus(), "RecruitmentDemand", demand.getId(),
                "Décision RH sur la demande");

        notificationService.notify("USER", demand.getRequestedBy().getId(), "EMAIL",
                "DEMAND_DECISION", Map.of("demandId", demand.getId(), "status", demand.getStatus()));

        return demand;
    }
}
