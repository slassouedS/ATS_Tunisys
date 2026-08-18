package com.tunisys.ats.service;

import com.tunisys.ats.domain.*;
import com.tunisys.ats.dto.ApplicationStageUpdateRequest;
import com.tunisys.ats.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Module 8 — Planification des entretiens (Etapes 7/8 du CDC), en mode
 * "planification dirigee" : le RH/Recruteur/Technique choisit parmi ses propres
 * disponibilites lesquelles proposer a un candidat precis (avec mode Teams /
 * Visio / Presentiel deja fixe sur chaque creneau) ; le candidat choisit ensuite
 * un creneau parmi ceux qui lui ont ete proposes.
 *
 * 1. createSlot()      : l'interviewer configure ses disponibilites (grille).
 * 2. proposeSlots()    : il selectionne plusieurs de ses creneaux libres et les
 *                        propose a une candidature precise ("Envoyer invitation").
 * 3. bookSlot()        : le candidat choisit UN des creneaux qui lui ont ete
 *                        proposes ; les autres creneaux proposes-mais-non-choisis
 *                        sont automatiquement liberes (redeviennent proposables
 *                        a quelqu'un d'autre).
 * 4. submitOutcome()   : verdict GO/NO-GO qui fait avancer le pipeline.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewSlotRepository slotRepository;
    private final InterviewRepository interviewRepository;
    private final ApplicationRepository applicationRepository;
    private final ApplicationStageHistoryRepository stageHistoryRepository;
    private final ApplicationService applicationService;
    private final NotificationService notificationService;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public InterviewSlot createSlot(User interviewer, LocalDateTime start, LocalDateTime end,
                                     String mode, String location) {
        InterviewSlot slot = InterviewSlot.builder()
                .interviewer(interviewer)
                .slotStart(start)
                .slotEnd(end)
                .mode(mode)
                .location(location)
                .isBooked(false)
                .build();
        return slotRepository.save(slot);
    }

    /** Tous les creneaux (proposes ou non) d'un interviewer — pour l'affichage
     *  de sa grille de disponibilites. */
    public List<InterviewSlot> listAvailableSlotsForInterviewer(Long interviewerId) {
        return slotRepository.findByInterviewerIdAndIsBookedFalse(interviewerId);
    }

    /** Creneaux libres ET pas encore proposes a quelqu'un — c'est parmi ceux-la
     *  que l'interviewer choisit lesquels proposer a un candidat. */
    public List<InterviewSlot> listProposableSlotsForInterviewer(Long interviewerId) {
        return slotRepository.findByInterviewerIdAndIsBookedFalseAndProposedForApplicationIdIsNull(interviewerId);
    }

    /** Creneaux proposes a une candidature precise, en attente du choix du candidat. */
    public List<InterviewSlot> listProposedSlotsForApplication(Long applicationId) {
        return slotRepository.findByProposedForApplicationIdAndIsBookedFalse(applicationId);
    }

    public List<Interview> listForApplication(Long applicationId) {
        return interviewRepository.findByApplicationId(applicationId);
    }

    /**
     * Proposition de plusieurs creneaux a une candidature precise ("Envoyer invitation").
     * Les creneaux doivent appartenir a l'acteur, etre libres et pas deja proposes.
     */
    public List<InterviewSlot> proposeSlots(User actor, Long applicationId, List<Long> slotIds, String interviewType) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Candidature introuvable"));

        List<InterviewSlot> slots = slotRepository.findAllById(slotIds);
        if (slots.size() != slotIds.size()) {
            throw new IllegalArgumentException("Un ou plusieurs creneaux sont introuvables");
        }
        for (InterviewSlot slot : slots) {
            if (!slot.getInterviewer().getId().equals(actor.getId())) {
                throw new IllegalStateException("Ce creneau ne vous appartient pas");
            }
            if (Boolean.TRUE.equals(slot.getIsBooked())) {
                throw new IllegalStateException("Un des creneaux selectionnes est deja reserve");
            }
            if (slot.getProposedForApplicationId() != null) {
                throw new IllegalStateException("Un des creneaux selectionnes a deja ete propose a un autre candidat");
            }
            slot.setProposedForApplicationId(applicationId);
            slot.setInterviewType(interviewType);
        }
        slotRepository.saveAll(slots);

        notificationService.notify("CANDIDATE", application.getCandidate().getId(), "EMAIL",
                "INTERVIEW_SLOTS_PROPOSED", Map.of(
                        "interviewType", interviewType,
                        "slotsCount", slots.size()
                ));

        return slots;
    }

    /** Reservation transactionnelle : le candidat choisit UN des creneaux qui lui
     *  ont ete proposes. Le lock optimiste (@Version) fait echouer une double
     *  reservation concurrente (cf. CDC 8.4). Les autres creneaux proposes a la
     *  meme candidature et non choisis sont automatiquement liberes. */
    public Interview bookSlot(Long applicationId, Long slotId, String interviewType) {
        Application application = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new IllegalArgumentException("Candidature introuvable"));
        InterviewSlot slot = slotRepository.findById(slotId)
                .orElseThrow(() -> new IllegalArgumentException("Creneau introuvable"));

        if (Boolean.TRUE.equals(slot.getIsBooked())) {
            throw new IllegalStateException("Ce creneau vient d'etre reserve par quelqu'un d'autre");
        }
        if (!applicationId.equals(slot.getProposedForApplicationId())) {
            throw new IllegalStateException("Ce creneau ne vous a pas ete propose");
        }

        try {
            slot.setIsBooked(true);
            slotRepository.saveAndFlush(slot);
        } catch (ObjectOptimisticLockingFailureException e) {
            throw new IllegalStateException("Ce creneau vient d'etre reserve par quelqu'un d'autre");
        }

        // Libere les autres creneaux qui avaient ete proposes pour ce meme entretien
        // mais que le candidat n'a pas choisis — ils redeviennent proposables a
        // quelqu'un d'autre.
        List<InterviewSlot> siblings = slotRepository.findByProposedForApplicationIdAndIsBookedFalse(applicationId);
        for (InterviewSlot sibling : siblings) {
            sibling.setProposedForApplicationId(null);
            sibling.setInterviewType(null);
        }
        if (!siblings.isEmpty()) {
            slotRepository.saveAll(siblings);
        }

        Interview interview = Interview.builder()
                .application(application)
                .slot(slot)
                .interviewType(interviewType)
                .videoLink("VISIO".equals(slot.getMode()) ? generateVideoLink() : null)
                .icsGenerated(true) // generation .ics deleguee au NotificationService/consumer
                .outcome("PENDING")
                .build();
        interview = interviewRepository.save(interview);

        // La reservation d'un entretien RH est le declencheur qui fait entrer la
        // candidature dans l'etape RH_INTERVIEW (planification semi-auto, CDC Etape 7).
        // La reservation d'un entretien technique ne re-transitionne pas : la candidature
        // est deja en TECH_INTERVIEW a ce moment-la (place par le GO de l'entretien RH).
        if ("RH".equals(interviewType) && "ASSESSMENT_DONE".equals(application.getCurrentStage())) {
            advanceStageAutomatically(application, "RH_INTERVIEW", "Entretien RH planifie");
        }

        safeSend("interview-scheduled", Map.of(
                "interviewId", interview.getId(),
                "applicationId", applicationId,
                "slotStart", slot.getSlotStart().toString()
        ));

        notificationService.notify("CANDIDATE", application.getCandidate().getId(), "EMAIL",
                "INTERVIEW_CONFIRMED", Map.of("slotStart", slot.getSlotStart().toString()));
        notificationService.notify("USER", slot.getInterviewer().getId(), "EMAIL",
                "INTERVIEW_CONFIRMED", Map.of("slotStart", slot.getSlotStart().toString()));

        return interview;
    }

    /**
     * Soumission du verdict d'un entretien (Etapes 7 et 8 du workflow CDC).
     * GO fait avancer le pipeline vers l'etape suivante ; NO_GO rejette la candidature.
     *
     * @param actor         l'utilisateur qui soumet le verdict (Charge de Recrutement pour
     *                      RH, Responsable Technique pour TECHNIQUE)
     * @param applicationId la candidature concernee
     * @param interviewType "RH" ou "TECHNIQUE"
     * @param outcome       "GO" ou "NO_GO"
     * @param report        compte-rendu libre de l'entretien
     */
    public Interview submitOutcome(User actor, Long applicationId, String interviewType,
                                    String outcome, String report) {
        Interview interview = interviewRepository
                .findTopByApplicationIdAndInterviewTypeOrderByCreatedAtDesc(applicationId, interviewType)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Aucun entretien " + interviewType + " trouve pour cette candidature"));

        interview.setOutcome(outcome);
        interview.setReport(report);
        interview = interviewRepository.save(interview);

        String nextStage = switch (interviewType) {
            case "RH" -> "GO".equals(outcome) ? "TECH_INTERVIEW" : "REJECTED";
            case "TECHNIQUE" -> "GO".equals(outcome) ? "FINAL_REVIEW" : "REJECTED";
            default -> throw new IllegalArgumentException("Type d'entretien inconnu : " + interviewType);
        };

        applicationService.changeStage(actor, applicationId,
                new ApplicationStageUpdateRequest(nextStage, report));

        return interview;
    }

    /** Transition "systeme" (pas d'utilisateur humain a l'origine, ex: le candidat reserve
     *  lui-meme son creneau). Meme pattern que AssessmentService.submit() : changedBy non
     *  renseigne (colonne nullable). */
    private void advanceStageAutomatically(Application application, String toStage, String comment) {
        String from = application.getCurrentStage();
        application.setCurrentStage(toStage);
        applicationRepository.save(application);
        stageHistoryRepository.save(ApplicationStageHistory.builder()
                .application(application)
                .fromStage(from)
                .toStage(toStage)
                .comment(comment)
                .build());
        safeSend("stage-changed", Map.of(
                "applicationId", application.getId(), "from", from, "to", toStage
        ));
    }

    /** Envoi Kafka "best effort" — voir CandidateService.safeSend() pour le rationnel complet :
     *  ne doit jamais faire echouer une reservation de creneau si Kafka est indisponible. */
    private void safeSend(String topic, Map<String, Object> payload) {
        try {
            kafkaTemplate.send(topic, payload);
        } catch (Exception e) {
            log.warn("Kafka indisponible, event '{}' non publie : {}", topic, e.getMessage());
        }
    }

    private String generateVideoLink() {
        // TODO production : appeler Microsoft Graph API / Google Meet API (Adapter Pattern,
        // cf. feuille de route section 1.3) pour generer un vrai lien. Stub ici pour le MVP.
        return "https://teams.microsoft.com/l/meetup-join/" + UUID.randomUUID();
    }
}
