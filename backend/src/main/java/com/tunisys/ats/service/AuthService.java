package com.tunisys.ats.service;

import com.tunisys.ats.domain.User;
import com.tunisys.ats.dto.LoginRequest;
import com.tunisys.ats.dto.LoginResponse;
import com.tunisys.ats.repository.UserRepository;
import com.tunisys.ats.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuditService auditService;

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new IllegalArgumentException("Identifiants invalides"));

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new IllegalStateException("Compte désactivé — contactez l'administrateur");
        }
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Identifiants invalides");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtService.generateAccessToken(user.getEmail(), Map.of(
                "role", user.getRole().getCode(),
                "userId", user.getId(),
                "principalType", "STAFF"
        ));

        auditService.log(user, "LOGIN", "User", user.getId(), "Connexion réussie");

        return new LoginResponse(token, user.getEmail(), user.getRole().getCode(),
                user.getFirstName(), user.getLastName());
    }
}
