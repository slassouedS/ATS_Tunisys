package com.tunisys.ats.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Module 8 — Grille d'evaluation technique detaillee (Etape 8 du CDC), en
 *  complement du verdict GO/NO-GO simple deja gere par Interview.outcome. */
@Entity
@Table(name = "technical_evaluations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TechnicalEvaluation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    /** JSON : { "arch_microservices": 5, "java_17": 4, ... } — notes 1-5 par
     *  sous-critere, cf. TechnicalEvaluationGrid pour la structure complete. */
    @Column(name = "ratings_json", columnDefinition = "TEXT", nullable = false)
    private String ratingsJson;

    /** Score pondere sur 100, calcule cote serveur (source de verite) a partir
     *  des coefficients de TechnicalEvaluationGrid. */
    @Column(name = "weighted_score", nullable = false)
    private BigDecimal weightedScore;

    @Column(name = "points_forts", columnDefinition = "TEXT")
    private String pointsForts;

    @Column(name = "points_amelioration", columnDefinition = "TEXT")
    private String pointsAmelioration;

    @Column(name = "niveau_propose")
    private String niveauPropose;

    @Column(nullable = false)
    private String decision; // GO, NO_GO

    @ManyToOne
    @JoinColumn(name = "submitted_by")
    private User submittedBy;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @PrePersist
    void onCreate() { submittedAt = LocalDateTime.now(); }
}
