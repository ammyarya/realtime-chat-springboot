package com.chatapp.realtimechat.websocket;

import java.security.Principal;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.chatapp.realtimechat.dto.UserResponse;
import com.chatapp.realtimechat.model.User;
import com.chatapp.realtimechat.service.UserService;

@Component
public class PresenceEventListener {
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ConcurrentMap<String, String> sessionToEmail = new ConcurrentHashMap<>();

    public PresenceEventListener(UserService userService, SimpMessagingTemplate messagingTemplate) {
        this.userService = userService;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void onConnect(SessionConnectedEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Principal principal = accessor.getUser();
        if (principal == null || principal.getName() == null) return;

        String email = principal.getName().toLowerCase();
        sessionToEmail.put(accessor.getSessionId(), email);
        userService.setOnline(email, true);

        try {
            User user = userService.getByEmail(email);
            messagingTemplate.convertAndSend("/topic/presence",
                    new UserResponse(user.getId(), user.getEmail(), userService.resolveDisplayName(user), true));
        } catch (IllegalArgumentException ignored) {
            // anonymous socket
        }
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        String email = sessionToEmail.remove(event.getSessionId());
        if (email == null) return;
        userService.setOnline(email, false);
        try {
            User user = userService.getByEmail(email);
            messagingTemplate.convertAndSend("/topic/presence",
                    new UserResponse(user.getId(), user.getEmail(), userService.resolveDisplayName(user), false));
        } catch (IllegalArgumentException ignored) {
            // anonymous socket
        }
    }
}
