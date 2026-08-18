package com.tunisys.ats.service;

import com.tunisys.ats.dto.ChatbotResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.Map;

/** Module 3 — Chatbot d'accueil. Proxy vers le microservice IA (LLM on-premise). */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatbotService {

    private final WebClient iaServiceWebClient;
    private final SystemConfigService systemConfigService;

    public ChatbotResponse ask(String message, String context) {
        try {
            return iaServiceWebClient.post()
                    .uri("/api/chatbot")
                    .bodyValue(Map.of(
                            "message", message,
                            "context", context == null ? "" : context,
                            "model", systemConfigService.getLlmModel()
                    ))
                    .retrieve()
                    .bodyToMono(ChatbotResponse.class)
                    .timeout(Duration.ofSeconds(60))
                    .block();
        } catch (Exception e) {
            log.error("Chatbot indisponible : {}", e.getMessage());
            return new ChatbotResponse(
                    "Desole, l'assistant est momentanement indisponible. "
                    + "N'hesitez pas a contacter notre equipe RH directement.");
        }
    }
}
