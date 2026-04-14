package com.chatapp.realtimechat.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 1, max = 120) String displayName,
        @NotBlank @Size(min = 6, max = 120) String password
) {}
