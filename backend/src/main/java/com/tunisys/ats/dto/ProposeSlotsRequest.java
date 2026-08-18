package com.tunisys.ats.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/** Proposition de creneaux par le RH/Recruteur/Technique a un candidat precis
 *  (planification dirigee — Etape 7/8 du CDC : "Envoyer invitation"). */
public record ProposeSlotsRequest(
        @NotEmpty List<Long> slotIds,
        @NotBlank String interviewType // RH ou TECHNIQUE
) {}
