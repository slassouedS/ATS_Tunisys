package com.tunisys.ats.controller;

import com.tunisys.ats.domain.Notification;
import com.tunisys.ats.domain.User;
import com.tunisys.ats.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Module 9 — Consultation des notifications de l'utilisateur connecte. */
@RestController
@RequestMapping("/api/recruteur/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public List<Notification> myNotifications(@AuthenticationPrincipal User user) {
        return notificationRepository.findByRecipientTypeAndRecipientId("USER", user.getId());
    }
}
