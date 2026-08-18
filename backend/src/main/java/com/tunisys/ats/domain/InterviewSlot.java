package com.tunisys.ats.domain;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "interview_slots")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InterviewSlot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    @JoinColumn(name = "interviewer_id", nullable = false)
    private User interviewer;
    @Column(name = "slot_start", nullable = false)
    private LocalDateTime slotStart;
    @Column(name = "slot_end", nullable = false)
    private LocalDateTime slotEnd;
    @Builder.Default
    private String mode = "VISIO"; // VISIO, PRESENTIEL
    private String location;
    @Column(name = "is_booked")
    @Builder.Default
    private Boolean isBooked = false;

    /** Candidature a laquelle ce creneau a ete propose (planification dirigee :
     *  le RH/Technique choisit ses disponibilites puis les propose a un candidat
     *  precis). Null tant que le creneau n'a ete propose a personne. */
    @Column(name = "proposed_for_application_id")
    private Long proposedForApplicationId;

    /** Type d'entretien pour lequel ce creneau a ete propose : RH ou TECHNIQUE.
     *  Rempli en meme temps que proposedForApplicationId. */
    @Column(name = "interview_type")
    private String interviewType;

    @Version
    private Integer version;
}
