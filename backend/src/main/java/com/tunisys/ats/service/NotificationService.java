package com.tunisys.ats.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tunisys.ats.domain.Notification;
import com.tunisys.ats.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Module 9 — Notifications automatisées.
 * Persiste la notification (statut PENDING) puis publie un événement Kafka ;
 * NotificationConsumer (@KafkaListener) traite l'envoi reel (email/SMS) de façon
 * asynchrone, decouplant le coeur metier des latences/pannes des fournisseurs externes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public void notify(String recipientType, Long recipientId, String channel,
                        String templateCode, Map<String, Object> payload) {
        String payloadJson;
        try {
            payloadJson = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            payloadJson = "{}";
        }

        Notification n = Notification.builder()
                .recipientType(recipientType)
                .recipientId(recipientId)
                .channel(channel)
                .templateCode(templateCode)
                .payload(payloadJson)
                .status("PENDING")
                .build();
        notificationRepository.save(n);

        try {
            kafkaTemplate.send("notification-requested", Map.of(
                    "notificationId", n.getId(),
                    "recipientType", recipientType,
                    "recipientId", recipientId,
                    "channel", channel,
                    "templateCode", templateCode,
                    "payload", payload
            ));
        } catch (Exception e) {
            log.warn("Kafka indisponible, notification {} restera en PENDING pour retry ultérieur", n.getId());
        }
    }
}
