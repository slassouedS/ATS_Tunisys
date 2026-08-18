package com.tunisys.ats.controller;

import com.tunisys.ats.domain.Application;
import com.tunisys.ats.domain.Assessment;
import com.tunisys.ats.domain.Candidate;
import com.tunisys.ats.repository.ApplicationRepository;
import com.tunisys.ats.repository.AssessmentRepository;
import com.tunisys.ats.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Optional;

/** Espace candidat authentifie (compte optionnel) — Module 2 "Mon espace". */
@RestController
@RequestMapping("/api/candidate/me")
@RequiredArgsConstructor
public class CandidateController {

    private final ApplicationRepository applicationRepository;
    private final AssessmentRepository assessmentRepository;
    private final JwtService jwtService;

    @Value("${app.public-base-url:http://localhost:4200}")
    private String publicBaseUrl;

    @GetMapping("/applications")
    public List<Application> myApplications(@AuthenticationPrincipal Candidate candidate) {
        return applicationRepository.findByCandidateId(candidate.getId());
    }

    /** Lien direct vers le test en ligne (si un test a ete envoye pour cette
     *  candidature) -- remplace l'envoi par email, non configure en natif. */
    @GetMapping("/applications/{applicationId}/assessment-link")
    public Object assessmentLink(@AuthenticationPrincipal Candidate candidate, @PathVariable Long applicationId) {
        Application application = applicationRepository.findById(applicationId)
                .filter(a -> a.getCandidate().getId().equals(candidate.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Candidature introuvable"));

        Optional<Assessment> assessment = assessmentRepository.findByApplicationId(applicationId)
                .stream().findFirst();

        if (assessment.isEmpty()) {
            return java.util.Map.of("available", false);
        }

        String token = jwtService.generateAssessmentToken(assessment.get().getId(), 7);
        var map = new java.util.HashMap<String, Object>();
        map.put("available", true);
        map.put("completed", assessment.get().getCompletedAt() != null);
        map.put("url", publicBaseUrl + "/portail/assessment/" + token);
        if (assessment.get().getCompletedAt() != null) {
            map.put("score", assessment.get().getScore());
            map.put("passingScore", assessment.get().getPassingScore());
        }
        return map;
    }
}
