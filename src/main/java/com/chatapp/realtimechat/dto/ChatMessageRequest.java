package com.chatapp.realtimechat.dto;

import jakarta.validation.constraints.NotBlank;

public record ChatMessageRequest(@NotBlank String receiver, @NotBlank String content) {}
