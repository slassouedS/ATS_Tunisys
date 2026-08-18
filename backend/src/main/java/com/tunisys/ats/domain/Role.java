package com.tunisys.ats.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "roles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String code;   // MANAGER, RH, RECRUTEUR, TECH, ADMIN

    @Column(nullable = false, length = 100)
    private String label;
}
