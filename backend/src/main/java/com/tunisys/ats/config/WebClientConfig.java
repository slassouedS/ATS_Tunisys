package com.tunisys.ats.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${app.ia-service.base-url}")
    private String iaServiceBaseUrl;

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    @Bean
    public WebClient iaServiceWebClient() {
        return WebClient.builder()
                .baseUrl(iaServiceBaseUrl)
                .build();
    }
}
