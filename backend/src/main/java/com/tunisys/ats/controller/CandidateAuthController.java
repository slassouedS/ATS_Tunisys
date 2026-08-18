package com.tunisys.ats.controller;

import com.tunisys.ats.dto.CandidateAuthResponse;
import com.tunisys.ats.dto.CandidateLoginRequest;
import com.tunisys.ats.dto.CandidateRegisterRequest;
import com.tunisys.ats.service.CandidateAuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Module 2 — Compte candidat (optionnel). Public : creation de compte + connexion. */
@RestController
@RequestMapping("/api/public/candidate")
@RequiredArgsConstructor
public class CandidateAuthController {

    private final CandidateAuthService candidateAuthService;

    @PostMapping("/register")
    public CandidateAuthResponse register(@Valid @RequestBody CandidateRegisterRequest request) {
        return candidateAuthService.register(request);
    }

    @PostMapping("/login")
    public CandidateAuthResponse login(@Valid @RequestBody CandidateLoginRequest request) {
        return candidateAuthService.login(request);
    }
}
