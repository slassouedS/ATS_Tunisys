package com.tunisys.ats.service;

import com.tunisys.ats.domain.Application;
import com.tunisys.ats.repository.ApplicationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Module 5 — Moteur de recherche CVtheque. Appelle directement l'API REST
 * d'Elasticsearch (pas de dependance spring-data-elasticsearch, pour eviter les
 * soucis de compatibilite de version et garder ce service leger/autonome).
 *
 * Index utilise : "candidates_search" (cf. feuille de route section 3.1).
 *
 * REPLI POSTGRESQL : en environnement natif, Elasticsearch n'est generalement
 * pas lance (pas de conteneur dedie). Plutot que de rendre la CVtheque
 * indisponible, search() bascule automatiquement sur une recherche PostgreSQL
 * (ApplicationRepository.searchCvtheque) des que l'appel Elasticsearch echoue
 * ou timeout. Le resultat a exactement la meme forme cote frontend, donc ce
 * repli est totalement transparent pour l'UI.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ElasticsearchIndexService {

    private final WebClient.Builder webClientBuilder;
    private final ApplicationRepository applicationRepository;

    @Value("${app.elasticsearch.url}")
    private String elasticsearchUrl;

    private static final String INDEX = "candidates_search";

    private WebClient client() {
        return webClientBuilder.baseUrl(elasticsearchUrl).build();
    }

    /** Indexe (ou met a jour) un document candidat. Echec silencieux et journalise :
     *  la CVtheque est une fonctionnalite de confort, elle ne doit jamais faire
     *  echouer le flux principal de candidature si Elasticsearch est indisponible. */
    public void indexCandidateApplication(Long applicationId, Map<String, Object> document) {
        try {
            client().put()
                    .uri("/{index}/_doc/{id}", INDEX, applicationId)
                    .bodyValue(document)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(5))
                    .onErrorResume(e -> {
                        log.warn("Indexation Elasticsearch echouee pour candidature {} : {}",
                                applicationId, e.getMessage());
                        return Mono.empty();
                    })
                    .subscribe();
        } catch (Exception e) {
            log.warn("Indexation Elasticsearch echouee pour candidature {} : {}", applicationId, e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> search(String query, int size) {
        try {
            Map<String, Object> esQuery = Map.of(
                    "size", size,
                    "query", Map.of(
                            "multi_match", Map.of(
                                    "query", query,
                                    "fields", List.of("candidateName^2", "cvText", "offerTitle", "skills")
                            )
                    )
            );
            Map<String, Object> response = client().post()
                    .uri("/{index}/_search", INDEX)
                    .bodyValue(esQuery)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(3))
                    .block();

            if (response == null) throw new IllegalStateException("Reponse Elasticsearch vide");
            Map<String, Object> hitsWrapper = (Map<String, Object>) response.get("hits");
            List<Map<String, Object>> hits = (List<Map<String, Object>>) hitsWrapper.get("hits");
            return hits.stream().map(h -> {
                Map<String, Object> source = (Map<String, Object>) h.get("_source");
                source.put("_score", h.get("_score"));
                source.put("_id", h.get("_id"));
                return source;
            }).toList();
        } catch (Exception e) {
            log.info("Elasticsearch indisponible ({}), repli sur la recherche PostgreSQL.", e.getMessage());
            return searchPostgres(query, size);
        }
    }

    /** Recherche de repli sur PostgreSQL — meme forme de resultat que la
     *  recherche Elasticsearch, pour rester transparente cote frontend. */
    private List<Map<String, Object>> searchPostgres(String query, int size) {
        List<Application> matches = applicationRepository.searchCvtheque(query, PageRequest.of(0, size));
        List<Map<String, Object>> results = new ArrayList<>();
        for (Application a : matches) {
            Map<String, Object> doc = new java.util.HashMap<>();
            doc.put("candidateName", a.getCandidate().getFirstName() + " " + a.getCandidate().getLastName());
            doc.put("candidateEmail", a.getCandidate().getEmail());
            doc.put("offerTitle", a.getOffer().getTitle());
            doc.put("aiScore", a.getAiScore());
            doc.put("currentStage", a.getCurrentStage());
            doc.put("_score", 1.0);
            doc.put("_id", String.valueOf(a.getId()));
            results.add(doc);
        }
        return results;
    }
}
