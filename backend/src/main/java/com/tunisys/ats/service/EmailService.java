package com.tunisys.ats.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Envoi reel d'emails via SMTP (Module 9). En developpement, le SMTP pointe vers
 * MailHog (docker-compose) : aucun compte reel requis, les emails sont visibles
 * sur http://localhost:8025. En production, changez SMTP_HOST/PORT/USERNAME/PASSWORD
 * dans .env vers votre serveur SMTP interne ou un fournisseur (SendGrid, etc.).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.notifications.email-from}")
    private String fromAddress;

    public void send(String toEmail, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email envoye a {} (sujet: {})", toEmail, subject);
        } catch (Exception e) {
            log.error("Echec envoi email a {} : {}", toEmail, e.getMessage());
            throw new RuntimeException("Echec envoi email", e);
        }
    }

    /** Construit le corps du message a partir d'un code de template + variables. */
    public String renderTemplate(String templateCode, Map<String, Object> vars) {
        return switch (templateCode) {
            case "APPLICATION_RECEIVED" -> """
                Bonjour,

                Nous avons bien recu votre candidature pour le poste "%s".
                Notre equipe RH va etudier votre profil et reviendra vers vous rapidement.

                L'equipe recrutement TUNISYS
                """.formatted(vars.getOrDefault("offerTitle", ""));

            case "DEMAND_PENDING_VALIDATION" -> """
                Bonjour,

                Une nouvelle demande de recrutement "%s" attend votre validation.
                Connectez-vous a la plateforme pour la traiter.

                TUNISYS ATS
                """.formatted(vars.getOrDefault("title", ""));

            case "DEMAND_DECISION" -> """
                Bonjour,

                Votre demande de recrutement a ete traitee. Statut : %s.
                Connectez-vous a la plateforme pour plus de details.

                TUNISYS ATS
                """.formatted(vars.getOrDefault("status", ""));

            case "INTERVIEW_CONFIRMED" -> """
                Bonjour,

                Votre entretien est confirme pour le %s.
                Vous recevrez le lien de connexion (si visio) juste avant le rendez-vous.

                L'equipe recrutement TUNISYS
                """.formatted(vars.getOrDefault("slotStart", ""));

            case "ASSESSMENT_INVITATION" -> """
                Bonjour,

                Dans le cadre de votre candidature, merci de completer le test suivant :
                %s

                Ce lien est valable 7 jours.

                L'equipe recrutement TUNISYS
                """.formatted(vars.getOrDefault("assessmentUrl", ""));

            default -> "Notification TUNISYS ATS : " + vars;
        };
    }

    public String subjectFor(String templateCode) {
        return switch (templateCode) {
            case "APPLICATION_RECEIVED" -> "Confirmation de votre candidature - TUNISYS";
            case "DEMAND_PENDING_VALIDATION" -> "Nouvelle demande a valider - TUNISYS ATS";
            case "DEMAND_DECISION" -> "Mise a jour de votre demande - TUNISYS ATS";
            case "INTERVIEW_CONFIRMED" -> "Confirmation d'entretien - TUNISYS";
            case "ASSESSMENT_INVITATION" -> "Test a completer - TUNISYS";
            default -> "Notification TUNISYS ATS";
        };
    }
}
