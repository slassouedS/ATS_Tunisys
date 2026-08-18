package com.tunisys.ats.service;

import com.tunisys.ats.domain.Candidate;
import com.tunisys.ats.domain.Notification;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.repository.CandidateRepository;
import com.tunisys.ats.repository.NotificationRepository;
import com.tunisys.ats.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Traite reellement l'envoi des notifications (Module 9) en consommant les
 * evenements publies par NotificationService. Decouple : un fournisseur SMTP/SMS
 * lent ou en panne ne bloque jamais le thread HTTP d'origine (creation de
 * candidature, changement d'etape, etc.).
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationConsumer {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final CandidateRepository candidateRepository;
    private final EmailService emailService;
    private final SmsService smsService;

    @KafkaListener(topics = "notification-requested", groupId = "${spring.kafka.consumer.group-id}")
    public void consume(Map<String, Object> event) {
        Object idRaw = event.get("notificationId");
        if (idRaw == null) return;
        Long notificationId = ((Number) idRaw).longValue();

        Notification notification = notificationRepository.findById(notificationId).orElse(null);
        if (notification == null) {
            log.warn("Notification {} introuvable (deja traitee ou supprimee).", notificationId);
            return;
        }
        if (!"PENDING".equals(notification.getStatus())) {
            return; // deja traitee (evite les doublons en cas de re-livraison Kafka)
        }

        try {
            switch (notification.getChannel()) {
                case "EMAIL" -> handleEmail(notification);
                case "SMS" -> handleSms(notification);
                default -> {
                    // WEBSOCKET ou autre canal non encore implemente : no-op pour le MVP
                    notification.setStatus("SENT");
                }
            }
            notification.setSentAt(LocalDateTime.now());
        } catch (Exception e) {
            log.error("Echec du traitement de la notification {} : {}", notificationId, e.getMessage());
            notification.setStatus("FAILED");
        }
        notificationRepository.save(notification);
    }

    private void handleEmail(Notification notification) {
        String email = resolveEmail(notification.getRecipientType(), notification.getRecipientId());
        if (email == null) {
            throw new IllegalStateException("Adresse email introuvable pour "
                    + notification.getRecipientType() + "#" + notification.getRecipientId());
        }
        Map<String, Object> vars = parsePayload(notification.getPayload());
        String subject = emailService.subjectFor(notification.getTemplateCode());
        String body = emailService.renderTemplate(notification.getTemplateCode(), vars);
        emailService.send(email, subject, body);
        notification.setStatus("SENT");
    }

    private void handleSms(Notification notification) {
        String phone = resolvePhone(notification.getRecipientType(), notification.getRecipientId());
        Map<String, Object> vars = parsePayload(notification.getPayload());
        String body = emailService.renderTemplate(notification.getTemplateCode(), vars);
        boolean reallySent = smsService.send(phone, body);
        notification.setStatus(reallySent ? "SENT" : "SENT_LOG");
    }

    private String resolveEmail(String recipientType, Long recipientId) {
        if ("USER".equals(recipientType)) {
            return userRepository.findById(recipientId).map(User::getEmail).orElse(null);
        }
        if ("CANDIDATE".equals(recipientType)) {
            return candidateRepository.findById(recipientId).map(Candidate::getEmail).orElse(null);
        }
        return null;
    }

    private String resolvePhone(String recipientType, Long recipientId) {
        if ("CANDIDATE".equals(recipientType)) {
            return candidateRepository.findById(recipientId).map(Candidate::getPhone).orElse(null);
        }
        return null; // les utilisateurs internes n'ont pas de telephone en base pour le moment
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parsePayload(String payloadJson) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(payloadJson, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }
}
