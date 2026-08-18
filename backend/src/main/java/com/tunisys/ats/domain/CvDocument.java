package com.tunisys.ats.domain;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "cv_documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CvDocument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    @JoinColumn(name = "candidate_id", nullable = false)
    private Candidate candidate;
    @Column(name = "mongo_ref_id", nullable = false, length = 64)
    private String mongoRefId;
    @Column(name = "file_name")
    private String fileName;
    @Column(name = "file_format")
    private String fileFormat;
    @Column(name = "parsing_status")
    @Builder.Default
    private String parsingStatus = "PENDING"; // PENDING, DONE, FAILED

    /** Texte extrait du CV (parsing IA). Persiste en base pour permettre la
     *  recherche CVtheque via PostgreSQL, independamment de la disponibilite
     *  d'Elasticsearch (qui n'est pas lance en environnement natif). */
    @Column(name = "cv_text", columnDefinition = "TEXT")
    private String cvText;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;
    @PrePersist
    void onCreate() { uploadedAt = LocalDateTime.now(); }
}
