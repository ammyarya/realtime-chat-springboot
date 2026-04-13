package com.chatapp.realtimechat.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.chatapp.realtimechat.dto.ChatMessageRequest;
import com.chatapp.realtimechat.dto.ChatMessageResponse;
import com.chatapp.realtimechat.dto.MessageStatusUpdateRequest;
import com.chatapp.realtimechat.service.ChatService;

@RestController
@RequestMapping("/api/messages")
public class ChatController {
    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @MessageMapping("/chat.send")
    public void send(ChatMessageRequest request, Principal principal) {
        chatService.saveAndDispatch(principal.getName(), request);
    }

    @MessageMapping("/chat.delivered")
    public void delivered(MessageStatusUpdateRequest request, Principal principal) {
        if (request != null && request.messageId() != null) {
            chatService.markDelivered(request.messageId(), principal.getName());
        }
    }

    @GetMapping("/history")
    public List<ChatMessageResponse> history(@RequestParam String user1, @RequestParam String user2) {
        return chatService.history(user1, user2);
    }

    @PutMapping("/seen")
    public void seen(@RequestParam String viewer, @RequestParam String friend) {
        chatService.markSeenForChat(viewer, friend);
    }
}
