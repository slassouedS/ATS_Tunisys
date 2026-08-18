package com.tunisys.ats.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "applications",
       uniqueConstraints = @UniqueConstraint(columnNames = {"candidate_id", "offer_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Application {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;

    @ManyToOne
    @JoinColumn(name = "offer_id", nullable = false)
    private JobOffer offer;

    @ManyToOne
    @JoinColumn(name = "cv_document_id")
    private CvDocument cvDocument;

    @Column(name = "ai_score")
    private BigDecimal aiScore;

    @Column(name = "ai_score_explanation", columnDefinition = "TEXT")
    private String aiScoreExplanation;

    @Column(name = "current_stage", nullable = false)
    @Builder.Default
    private String currentStage = "RECEIVED";
    // RECEIVED, SCORED, SHORTLISTED, ASSESSMENT_SENT, ASSESSMENT_DONE,
    // RH_INTERVIEW, TECH_INTERVIEW, FINAL_REVIEW, HIRED, REJECTED

    @ManyToOne
    @JoinColumn(name = "assigned_recruiter_id")
    private User assignedRecruiter;

    @ManyToOne
    @JoinColumn(name = "assigned_technical_id")
    private User assignedTechnical;

    @Column(name = "final_decision")
    private String finalDecision; // HIRED, REJECTED

    @ManyToOne
    @JoinColumn(name = "decision_by")
    private User decisionBy;

    @Column(name = "decision_at")
    private LocalDateTime decisionAt;

    @Version
    private Integer version;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = LocalDateTime.now(); }
}
