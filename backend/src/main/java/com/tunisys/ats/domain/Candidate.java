package com.tunisys.ats.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "candidates")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Candidate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    private String phone;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "linkedin_url")
    private String linkedinUrl;

    /** Mot de passe (hache) -- optionnel : un candidat peut postuler sans compte
     *  (email seul, cf. CDC) OU creer un compte pour suivre ses candidatures
     *  plus facilement. Nul si aucun compte n'a ete cree. */
    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "gdpr_consent_at")
    private LocalDateTime gdprConsentAt;

    @Column(name = "data_retention_until")
    private LocalDate dataRetentionUntil;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { createdAt = LocalDateTime.now(); }
}
