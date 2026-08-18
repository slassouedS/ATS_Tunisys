package com.tunisys.ats.service;

import com.tunisys.ats.domain.JobOffer;
import com.tunisys.ats.domain.RecruitmentDemand;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.OfferCreateRequest;
import com.tunisys.ats.repository.JobOfferRepository;
import com.tunisys.ats.repository.RecruitmentDemandRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/** Module 2 — Publication des offres sur le portail carrière (Étape 3 du workflow). */
@Service
@RequiredArgsConstructor
public class OfferService {

    private final JobOfferRepository offerRepository;
    private final RecruitmentDemandRepository demandRepository;
    private final AuditService auditService;
    private final SystemConfigService systemConfigService;

    public JobOffer create(User rhUser, OfferCreateRequest req) {
        RecruitmentDemand demand = demandRepository.findById(req.demandId())
                .orElseThrow(() -> new IllegalArgumentException("Demande introuvable"));

        if (!"VALIDATED".equals(demand.getStatus())) {
            throw new IllegalStateException("La demande doit être validée par le RH avant de publier une offre");
        }

        JobOffer offer = JobOffer.builder()
                .demand(demand)
                .title(req.title())
                .description(req.description())
                .requirements(req.requirements())
                .location(req.location())
                .contractType(req.contractType())
                .aiScoreThreshold(req.aiScoreThreshold() != null ? req.aiScoreThreshold() : systemConfigService.getDefaultThreshold())
                .status("DRAFT")
                .build();
        offer = offerRepository.save(offer);
        auditService.log(rhUser, "OFFER_CREATED", "JobOffer", offer.getId(), offer.getTitle());
        return offer;
    }

    public JobOffer publish(User rhUser, Long offerId) {
        JobOffer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new IllegalArgumentException("Offre introuvable"));
        offer.setStatus("PUBLISHED");
        offer.setPublishedAt(LocalDateTime.now());
        offer = offerRepository.save(offer);
        auditService.log(rhUser, "OFFER_PUBLISHED", "JobOffer", offer.getId(), offer.getTitle());
        return offer;
    }

    public List<JobOffer> findPublished() {
        return offerRepository.findByStatus("PUBLISHED");
    }

    public List<JobOffer> findAll() {
        return offerRepository.findAll();
    }

    public JobOffer findById(Long id) {
        return offerRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Offre introuvable"));
    }
}
