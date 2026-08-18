package com.tunisys.ats.service;

import com.tunisys.ats.domain.AuditLog;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Traçabilité complète des actions (FN-14). Volontairement simple et synchrone :
 *  le volume d'écriture est faible (actions RH), inutile de passer par Kafka ici. */
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void log(User actor, String action, String entityType, Long entityId, String details) {
        AuditLog entry = AuditLog.builder()
                .actorUser(actor)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .build();
        auditLogRepository.save(entry);
    }
}
