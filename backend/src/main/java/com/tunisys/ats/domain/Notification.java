package com.tunisys.ats.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "recipient_type", nullable = false)
    private String recipientType; // USER, CANDIDATE

    @Column(name = "recipient_id", nullable = false)
    private Long recipientId;

    @Column(nullable = false)
    private String channel; // EMAIL, SMS, WEBSOCKET

    @Column(name = "template_code")
    private String templateCode;

    @Column(columnDefinition = "TEXT")
    private String payload;

    @Builder.Default
    private String status = "PENDING"; // PENDING, SENT, FAILED

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}
