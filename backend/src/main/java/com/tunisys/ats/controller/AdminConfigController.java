package com.tunisys.ats.controller;

import com.tunisys.ats.dto.AiConfigDto;
import com.tunisys.ats.dto.AiConfigUpdateRequest;
import com.tunisys.ats.service.SystemConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/** Module Admin — Configuration IA : seuil de score par defaut + choix du
 *  modele LLM on-premise (Ollama), reellement applique aux appels suivants. */
@RestController
@RequestMapping("/api/admin/ai-config")
@RequiredArgsConstructor
@Slf4j
public class AdminConfigController {

    private final SystemConfigService systemConfigService;
    private final WebClient iaServiceWebClient;

    @GetMapping
    public AiConfigDto get() {
        var config = systemConfigService.get();
        return new AiConfigDto(
                config.getDefaultAiScoreThreshold(),
                config.getLlmModel(),
                fetchAvailableModels(),
                "Sentence-Transformers (embeddings locaux)"
        );
    }

    @PutMapping
    public AiConfigDto update(@Valid @RequestBody AiConfigUpdateRequest request) {
        systemConfigService.updateThreshold(request.defaultAiScoreThreshold());
        if (request.llmModel() != null && !request.llmModel().isBlank()) {
            systemConfigService.updateModel(request.llmModel());
        }
        return get();
    }

    /** Interroge Ollama (via ia-service) pour la liste des modeles reellement
     *  telecharges -- pas une liste devinee a l'aveugle. */
    @SuppressWarnings("unchecked")
    private List<String> fetchAvailableModels() {
        try {
            Map<String, Object> response = iaServiceWebClient.get()
                    .uri("/api/models")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(5))
                    .block();
            if (response != null && response.get("models") instanceof List<?> models) {
                return (List<String>) models;
            }
        } catch (Exception e) {
            log.warn("Impossible de recuperer la liste des modeles Ollama : {}", e.getMessage());
        }
        return List.of();
    }
}
