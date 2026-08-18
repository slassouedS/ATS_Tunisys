package com.tunisys.ats.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "recruitment_demands")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RecruitmentDemand {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @ManyToOne
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne
    @JoinColumn(name = "requested_by", nullable = false)
    private User requestedBy;

    @Column(name = "profile_desc", columnDefinition = "TEXT")
    private String profileDesc;

    private BigDecimal budget;

    @Builder.Default
    private String urgency = "NORMAL"; // NORMAL, URGENT

    @Builder.Default
    private String status = "PENDING"; // PENDING, VALIDATED, REJECTED

    @ManyToOne
    @JoinColumn(name = "validated_by")
    private User validatedBy;

    @Column(name = "validated_at")
    private LocalDateTime validatedAt;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}
