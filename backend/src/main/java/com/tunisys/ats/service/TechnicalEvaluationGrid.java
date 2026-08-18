package com.tunisys.ats.service;

import java.util.List;
import java.util.Map;

/** Grille fixe d'evaluation technique (Etape 8 du CDC) — memes categories,
 *  sous-criteres et coefficients pour tous les postes techniques. */
public final class TechnicalEvaluationGrid {

    public record Subcriterion(String id, String label) {}
    public record Category(String label, double coefficient, List<Subcriterion> subcriteria) {}

    public static final List<Category> CATEGORIES = List.of(
            new Category("Architecture & Conception", 0.30, List.of(
                    new Subcriterion("arch_microservices", "Conception architectures distribuees / microservices"),
                    new Subcriterion("arch_patterns", "Design patterns (CQRS, Event Sourcing, Saga)"),
                    new Subcriterion("arch_api", "API Design (REST, gRPC, GraphQL)")
            )),
            new Category("Java / Spring Boot", 0.25, List.of(
                    new Subcriterion("java_17", "Java 17+ (records, sealed classes, virtual threads)"),
                    new Subcriterion("spring_boot", "Spring Boot 3.x / Spring Cloud"),
                    new Subcriterion("java_tests", "Tests unitaires & integration (JUnit 5, Testcontainers)")
            )),
            new Category("DevOps / Cloud / K8s", 0.20, List.of(
                    new Subcriterion("devops_k8s", "Kubernetes avance (Operator, HPA, KEDA, Istio)"),
                    new Subcriterion("devops_cicd", "CI/CD (GitLab, Argo CD, GitHub Actions)"),
                    new Subcriterion("devops_observability", "Observabilite (Prometheus, Grafana, Jaeger)")
            )),
            new Category("Leadership & Communication", 0.25, List.of(
                    new Subcriterion("lead_mentoring", "Capacite a faire monter en competences une equipe"),
                    new Subcriterion("lead_conflicts", "Gestion de conflits techniques"),
                    new Subcriterion("lead_clarity", "Clarte de presentation / pedagogie")
            ))
    );

    private TechnicalEvaluationGrid() {}

    /** Calcule le score pondere (sur 100) a partir des notes 1-5 par sous-critere.
     *  Score de categorie = moyenne des notes / 5. Score final = somme ponderee
     *  des scores de categorie par leur coefficient. Autorite serveur : le score
     *  affiche en temps reel cote client est indicatif, celui-ci fait foi. */
    public static double computeWeightedScore(Map<String, Integer> ratings) {
        double total = 0;
        for (Category cat : CATEGORIES) {
            double sum = 0;
            int count = 0;
            for (Subcriterion sc : cat.subcriteria()) {
                Integer rating = ratings.get(sc.id());
                if (rating != null) {
                    sum += Math.max(1, Math.min(5, rating));
                    count++;
                }
            }
            double categoryAvg = count > 0 ? sum / count : 0;
            total += (categoryAvg / 5.0) * cat.coefficient();
        }
        return Math.round(total * 1000.0) / 10.0; // sur 100, 1 decimale
    }
}
