package com.tunisys.ats.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

/** Déclare les topics métier utilisés par l'architecture événementielle (cf. feuille de route). */
@Configuration
public class KafkaTopicConfig {

    @Bean
    public NewTopic applicationCreatedTopic() {
        return TopicBuilder.name("application-created").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic scoreComputedTopic() {
        return TopicBuilder.name("score-computed").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic stageChangedTopic() {
        return TopicBuilder.name("stage-changed").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic interviewScheduledTopic() {
        return TopicBuilder.name("interview-scheduled").partitions(3).replicas(1).build();
    }

    @Bean
    public NewTopic notificationRequestedTopic() {
        return TopicBuilder.name("notification-requested").partitions(3).replicas(1).build();
    }
}
