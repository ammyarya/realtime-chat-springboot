package com.chatapp.realtimechat.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.chatapp.realtimechat.dto.ProfileUpdateRequest;
import com.chatapp.realtimechat.dto.UserResponse;
import com.chatapp.realtimechat.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserResponse> users(Principal principal) {
        return userService.getUsersExcluding(principal.getName());
    }

    @GetMapping("/me")
    public UserResponse me(Principal principal) {
        return userService.getProfile(principal.getName());
    }

    @PutMapping("/profile")
    public UserResponse updateProfile(@Valid @RequestBody ProfileUpdateRequest request, Principal principal) {
        return userService.updateProfile(principal.getName(), request);
    }
}