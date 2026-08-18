package com.tunisys.ats.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "interviews")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Interview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @ManyToOne
    @JoinColumn(name = "slot_id", nullable = false)
    private InterviewSlot slot;

    @Column(name = "interview_type", nullable = false)
    private String interviewType; // RH, TECHNIQUE

    @Column(name = "video_link", length = 500)
    private String videoLink;

    @Column(name = "ics_generated")
    @Builder.Default
    private Boolean icsGenerated = false;

    private String outcome; // GO, NO_GO, PENDING

    @Column(columnDefinition = "TEXT")
    private String report;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}
