package com.tunisys.ats.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "application_stage_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ApplicationStageHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "from_stage")
    private String fromStage;

    @Column(name = "to_stage", nullable = false)
    private String toStage;

    @ManyToOne
    @JoinColumn(name = "changed_by")
    private User changedBy;

    @Column(length = 1000)
    private String comment;

    @Column(name = "changed_at")
    private LocalDateTime changedAt;

    @PrePersist
    void onCreate() { changedAt = LocalDateTime.now(); }
}
