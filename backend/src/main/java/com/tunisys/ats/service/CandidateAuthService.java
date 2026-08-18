package com.tunisys.ats.service;

import com.tunisys.ats.domain.Candidate;
import com.tunisys.ats.dto.CandidateAuthResponse;
import com.tunisys.ats.dto.CandidateLoginRequest;
import com.tunisys.ats.dto.CandidateRegisterRequest;
import com.tunisys.ats.repository.CandidateRepository;
import com.tunisys.ats.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** Authentification candidat (compte optionnel — cf. Candidate.passwordHash). */
@Service
@RequiredArgsConstructor
public class CandidateAuthService {

    private final CandidateRepository candidateRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public CandidateAuthResponse register(CandidateRegisterRequest req) {
        Candidate candidate = candidateRepository.findByEmail(req.email()).orElse(null);

        if (candidate != null && candidate.getPasswordHash() != null) {
            throw new IllegalStateException("Un compte existe déjà avec cet email. Connectez-vous plutôt.");
        }

        if (candidate == null) {
            // Nouveau candidat (jamais postule auparavant)
            candidate = Candidate.builder()
                    .email(req.email())
                    .firstName(req.firstName())
                    .lastName(req.lastName())
                    .phone(req.phone())
                    .gdprConsentAt(LocalDateTime.now())
                    .dataRetentionUntil(LocalDate.now().plusYears(2))
                    .build();
        }
        // "Reclame" un profil existant (cree via une candidature sans compte prealable)
        candidate.setPasswordHash(passwordEncoder.encode(req.password()));
        if (req.phone() != null && !req.phone().isBlank()) {
            candidate.setPhone(req.phone());
        }
        candidate = candidateRepository.save(candidate);

        String token = jwtService.generateCandidateToken(candidate.getEmail());
        return new CandidateAuthResponse(token, candidate.getEmail(), candidate.getFirstName(), candidate.getLastName());
    }

    public CandidateAuthResponse login(CandidateLoginRequest req) {
        Candidate candidate = candidateRepository.findByEmail(req.email())
                .orElseThrow(() -> new IllegalArgumentException("Identifiants invalides"));

        if (candidate.getPasswordHash() == null) {
            throw new IllegalArgumentException("Aucun compte associé à cet email — créez-en un d'abord.");
        }
        if (!passwordEncoder.matches(req.password(), candidate.getPasswordHash())) {
            throw new IllegalArgumentException("Identifiants invalides");
        }

        String token = jwtService.generateCandidateToken(candidate.getEmail());
        return new CandidateAuthResponse(token, candidate.getEmail(), candidate.getFirstName(), candidate.getLastName());
    }
}
