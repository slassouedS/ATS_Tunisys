package com.tunisys.ats.config;

import com.tunisys.ats.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Patterns (pas setAllowedOrigins) pour pouvoir accepter n'importe quelle
        // origine tout en gardant allowCredentials(true) -- indispensable ici car
        // TUNISYS ATS est un outil interne accede par plusieurs utilisateurs depuis
        // leurs propres postes via l'IP du serveur (pas seulement "localhost").
        // A restreindre a une liste explicite de domaines si exposition au-dela
        // du reseau interne de l'entreprise.
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Portail public candidat + auth + docs — pas d'authentification requise
                .requestMatchers(
                        "/api/auth/**",
                        "/api/public/**",
                        "/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**", "/v3/api-docs.yaml",
                        "/webjars/**",
                        "/actuator/health"
                ).permitAll()
                .requestMatchers("/api/manager/**").hasRole("MANAGER")
                .requestMatchers("/api/rh/**").hasRole("RH")
                .requestMatchers("/api/recruteur/**").hasAnyRole("RECRUTEUR", "RH")
                // Compte TECH desactive chez TUNISYS : le Manager assure l'interim de
                // l'entretien technique (planification + verdict), donc il herite de
                // l'acces a ces endpoints en plus du role TECH (conserve pour une
                // reactivation future du profil Responsable Technique si besoin).
                .requestMatchers("/api/technique/**").hasAnyRole("TECH", "MANAGER")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/candidate/**").hasRole("CANDIDATE")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
