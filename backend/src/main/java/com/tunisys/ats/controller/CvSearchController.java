package com.tunisys.ats.controller;

import com.tunisys.ats.service.ElasticsearchIndexService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Module 5 — CVthèque : recherche avancée pour Recruteur/RH. */
@RestController
@RequestMapping("/api/recruteur/cvtheque")
@RequiredArgsConstructor
public class CvSearchController {

    private final ElasticsearchIndexService elasticsearchIndexService;

    @GetMapping("/search")
    public List<Map<String, Object>> search(@RequestParam String q,
                                             @RequestParam(defaultValue = "20") int size) {
        return elasticsearchIndexService.search(q, size);
    }
}
