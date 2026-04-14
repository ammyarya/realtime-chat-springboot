package com.chatapp.realtimechat.websocket;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import com.chatapp.realtimechat.security.JwtService;

@Component
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    public static final String ATTR_EMAIL = "jwt.email";

    private final JwtService jwtService;

    public JwtHandshakeInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Map<String, Object> attributes) {
        String query = request.getURI().getQuery();
        String token = extractParam(query, "token");
        if (!StringUtils.hasText(token)) {
            return false;
        }
        try {
            String email = jwtService.parseSubject(token);
            attributes.put(ATTR_EMAIL, email.toLowerCase());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public void afterHandshake(
            ServerHttpRequest request,
            ServerHttpResponse response,
            WebSocketHandler wsHandler,
            Exception exception) {
        // no-op
    }

    private static String extractParam(String query, String name) {
        if (!StringUtils.hasText(query)) {
            return null;
        }
        for (String pair : query.split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2 && name.equalsIgnoreCase(kv[0])) {
                return URLDecoder.decode(kv[1], StandardCharsets.UTF_8);
            }
        }
        return null;
    }
}
