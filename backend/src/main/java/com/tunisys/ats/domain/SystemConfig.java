package com.tunisys.ats.domain;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

/** Configuration globale de l'application — ligne unique (id=1).
 *  Module Admin -> Configuration IA. */
@Entity
@Table(name = "system_config")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SystemConfig {
    @Id
    private Long id;

    @Column(name = "default_ai_score_threshold")
    @Builder.Default
    private BigDecimal defaultAiScoreThreshold = new BigDecimal("70.00");

    @Column(name = "llm_model")
    @Builder.Default
    private String llmModel = "llama3.2:3b";
}
