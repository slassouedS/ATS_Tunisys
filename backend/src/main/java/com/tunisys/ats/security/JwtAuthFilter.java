package com.tunisys.ats.security;

import com.tunisys.ats.domain.Candidate;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.repository.CandidateRepository;
import com.tunisys.ats.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final CandidateRepository candidateRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                     @NonNull HttpServletResponse response,
                                     @NonNull FilterChain chain) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            chain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7);
        try {
            if (!jwtService.isTokenValid(token)) {
                chain.doFilter(request, response);
                return;
            }
            String email = jwtService.extractSubject(token);
            String principalType = jwtService.extractClaim(token, c -> c.get("principalType", String.class));

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                if ("CANDIDATE".equals(principalType)) {
                    Optional<Candidate> candidateOpt = candidateRepository.findByEmail(email);
                    if (candidateOpt.isPresent()) {
                        var authorities = List.of(new SimpleGrantedAuthority("ROLE_CANDIDATE"));
                        var authToken = new UsernamePasswordAuthenticationToken(candidateOpt.get(), null, authorities);
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                } else {
                    Optional<User> userOpt = userRepository.findByEmail(email);
                    if (userOpt.isPresent() && Boolean.TRUE.equals(userOpt.get().getIsActive())) {
                        User user = userOpt.get();
                        var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().getCode()));
                        var authToken = new UsernamePasswordAuthenticationToken(user, null, authorities);
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            }
        } catch (Exception ex) {
            // Token invalide/expiré : on laisse passer non authentifié, Spring Security bloquera si la route l'exige
        }
        chain.doFilter(request, response);
    }
}
