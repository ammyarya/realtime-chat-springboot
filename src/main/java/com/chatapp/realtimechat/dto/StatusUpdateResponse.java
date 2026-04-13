package com.chatapp.realtimechat.dto;

import com.chatapp.realtimechat.model.MessageStatus;

public record StatusUpdateResponse(Long messageId, MessageStatus status) {}
