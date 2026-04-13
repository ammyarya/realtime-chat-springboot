package com.chatapp.realtimechat.dto;

import java.time.LocalDateTime;

import com.chatapp.realtimechat.model.MessageStatus;

public record ChatMessageResponse(
        Long id, String sender, String receiver, String content, LocalDateTime timestamp, MessageStatus status
) {}
