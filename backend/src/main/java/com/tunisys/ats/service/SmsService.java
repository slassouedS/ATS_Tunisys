package com.tunisys.ats.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Envoi de SMS (Module 9). AUCUN fournisseur SMS reel n'est configure par defaut :
 * l'envoi de SMS necessite un compte payant (Twilio, Infobip...) que nous n'avons
 * pas de credentials pour ce projet. Interface prete pour brancher un vrai
 * fournisseur des que vous avez un compte -- voir le bloc "TODO PRODUCTION" ci-dessous.
 *
 * En attendant, les SMS sont journalises (log + statut "SENT_LOG" en base) pour
 * que le workflow ne soit jamais bloque par l'absence de fournisseur SMS.
 */
@Service
@Slf4j
public class SmsService {

    @Value("${app.notifications.sms-provider}")
    private String provider;

    /** @return true si reellement envoye, false si seulement journalise (mode "none"). */
    public boolean send(String toPhone, String body) {
        if (toPhone == null || toPhone.isBlank()) {
            log.warn("SMS non envoye : numero de telephone manquant.");
            return false;
        }

        if ("none".equalsIgnoreCase(provider)) {
            log.info("[SMS SIMULE - aucun fournisseur configure] A: {} | Message: {}", toPhone, body);
            return false;
        }

        // TODO PRODUCTION : brancher ici un vrai fournisseur, par exemple Twilio :
        //
        //   Twilio.init(accountSid, authToken);
        //   Message.creator(new PhoneNumber(toPhone), new PhoneNumber(fromNumber), body).create();
        //
        // ou Infobip via leur SDK/API REST. Ajoutez les credentials en variables
        // d'environnement (.env) et ajoutez la dependance Maven correspondante.
        log.warn("Fournisseur SMS '{}' non implemente -- SMS non envoye (mode journalisation).", provider);
        return false;
    }
}
