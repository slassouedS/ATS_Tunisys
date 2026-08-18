package com.tunisys.ats.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;
import java.util.function.Function;

/**
 * Génération / validation des JWT (access token).
 * Un token de réservation d'entretien (Module 8.2) est aussi émis ici,
 * mais avec un scope restreint (voir generateInterviewBookingToken).
 */
@Service
public class JwtService {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.access-token-ttl-minutes}")
    private long accessTokenTtlMinutes;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(String subjectEmail, Map<String, Object> claims) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + accessTokenTtlMinutes * 60_000);
        return Jwts.builder()
                .claims(claims)
                .subject(subjectEmail)
                .issuedAt(now)
                .expiration(exp)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /** Token candidat (compte optionnel) — distinct du personnel interne via le
     *  claim "principalType", verifie par JwtAuthFilter pour router vers le bon
     *  repository (User vs Candidate). */
    public String generateCandidateToken(String subjectEmail) {
        return generateAccessToken(subjectEmail, Map.of("principalType", "CANDIDATE", "role", "CANDIDATE"));
    }

    /** Token unique, courte durée, restreint à UNE candidature — pour le lien de réservation
     *  d'entretien envoyé au candidat sans nécessiter de compte (Module 8.2/8.3 du CDC). */
    public String generateInterviewBookingToken(Long applicationId, int expirationDays) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + (long) expirationDays * 24 * 60 * 60 * 1000);
        return Jwts.builder()
                .subject("interview-booking")
                .claim("applicationId", applicationId)
                .claim("scope", "INTERVIEW_BOOKING")
                .issuedAt(now)
                .expiration(exp)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    /** Token unique, courte duree, restreint a UN test — pour le lien d'E-Assessment
     *  envoye au candidat sans necessiter de compte (Module 7 du CDC). */
    public String generateAssessmentToken(Long assessmentId, int expirationDays) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + (long) expirationDays * 24 * 60 * 60 * 1000);
        return Jwts.builder()
                .subject("assessment-access")
                .claim("assessmentId", assessmentId)
                .claim("scope", "ASSESSMENT_ACCESS")
                .issuedAt(now)
                .expiration(exp)
                .signWith(key(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractSubject(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> resolver) {
        Claims claims = Jwts.parser().verifyWith(key()).build()
                .parseSignedClaims(token).getPayload();
        return resolver.apply(claims);
    }

    public boolean isTokenValid(String token) {
        try {
            Date exp = extractClaim(token, Claims::getExpiration);
            return exp.after(new Date());
        } catch (Exception e) {
            return false;
        }
    }
}
