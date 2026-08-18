package com.tunisys.ats.controller;

import com.tunisys.ats.dto.ChatbotRequest;
import com.tunisys.ats.dto.ChatbotResponse;
import com.tunisys.ats.service.ChatbotService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Chatbot public — accessible sans authentification depuis le portail carrière. */
@RestController
@RequestMapping("/api/public/chatbot")
@RequiredArgsConstructor
public class ChatbotController {

    private final ChatbotService chatbotService;

    @PostMapping
    public ChatbotResponse ask(@Valid @RequestBody ChatbotRequest request) {
        return chatbotService.ask(request.message(), request.context());
    }
}
