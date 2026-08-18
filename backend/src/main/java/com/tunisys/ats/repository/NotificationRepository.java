package com.tunisys.ats.repository;

import com.tunisys.ats.domain.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByRecipientTypeAndRecipientId(String recipientType, Long recipientId);
}
