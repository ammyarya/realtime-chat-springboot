package com.chatapp.realtimechat.config;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.support.DefaultHandshakeHandler;

import com.chatapp.realtimechat.websocket.JwtHandshakeInterceptor;

/**
 * Uses email set by {@link com.chatapp.realtimechat.websocket.JwtHandshakeInterceptor}.
 */
public class JwtWebSocketHandshakeHandler extends DefaultHandshakeHandler {

    @Override
    protected Principal determineUser(
            ServerHttpRequest request,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        Object email = attributes.get(JwtHandshakeInterceptor.ATTR_EMAIL);
        if (email instanceof String s && StringUtils.hasText(s)) {
            return () -> s;
        }
        return () -> UUID.randomUUID().toString();
    }
}
