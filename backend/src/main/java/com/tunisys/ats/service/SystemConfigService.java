package com.tunisys.ats.service;

import com.tunisys.ats.domain.SystemConfig;
import com.tunisys.ats.repository.SystemConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/** Configuration globale (ligne unique id=1, creee au premier acces si absente). */
@Service
@RequiredArgsConstructor
public class SystemConfigService {

    private final SystemConfigRepository repository;

    public SystemConfig get() {
        return repository.findById(1L).orElseGet(() -> repository.save(
                SystemConfig.builder().id(1L).defaultAiScoreThreshold(new BigDecimal("70.00")).build()));
    }

    public SystemConfig updateThreshold(BigDecimal threshold) {
        SystemConfig config = get();
        config.setDefaultAiScoreThreshold(threshold);
        return repository.save(config);
    }

    public SystemConfig updateModel(String model) {
        SystemConfig config = get();
        config.setLlmModel(model);
        return repository.save(config);
    }

    public String getLlmModel() {
        return get().getLlmModel();
    }

    public BigDecimal getDefaultThreshold() {
        return get().getDefaultAiScoreThreshold();
    }
}
