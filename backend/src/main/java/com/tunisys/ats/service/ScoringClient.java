package com.tunisys.ats.service;

import com.tunisys.ats.dto.ScoreResultDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.Map;

/**
 * Client vers le microservice IA (ia-service, Python/FastAPI) pour le scoring
 * sémantique CV vs offre (Module 6). Le LLM utilisé est on-premise (Ollama),
 * donc aucune donnée candidat ne quitte l'infrastructure TUNISYS.
 *
 * Un timeout + retry protège le coeur métier d'une latence/panne du service IA
 * (pattern Circuit Breaker recommandé dans la feuille de route — ici en version
 * simple ; passer à Resilience4j si le volume le justifie).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ScoringClient {

    private final WebClient iaServiceWebClient;
    private final SystemConfigService systemConfigService;

    public ScoreResultDto scoreCandidate(String cvText, String offerText) {
        try {
            return iaServiceWebClient.post()
                    .uri("/api/score")
                    .bodyValue(Map.of(
                            "cv_text", cvText,
                            "offer_text", offerText,
                            "model", systemConfigService.getLlmModel()
                    ))
                    .retrieve()
                    .bodyToMono(ScoreResultDto.class)
                    .timeout(Duration.ofSeconds(15))
                    .retryWhen(Retry.backoff(2, Duration.ofSeconds(2)))
                    .block();
        } catch (Exception e) {
            log.error("Erreur lors de l'appel au service de scoring IA : {}", e.getMessage());
            // Fallback dégradé : pas de blocage du pipeline, score neutre à revalider manuellement
            return new ScoreResultDto(BigDecimal.ZERO, "Scoring indisponible — à valider manuellement");
        }
    }

    public String parseCv(byte[] fileBytes, String fileName) {
        try {
            return iaServiceWebClient.post()
                    .uri("/api/parse-cv")
                    .bodyValue(Map.of("file_name", fileName, "content_base64",
                            java.util.Base64.getEncoder().encodeToString(fileBytes)))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(60))
                    .map(m -> String.valueOf(m.get("text")))
                    .block();
        } catch (Exception e) {
            log.error("Erreur lors du parsing CV : {}", e.getMessage());
            return "";
        }
    }
}
