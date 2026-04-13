package com.chatapp.realtimechat.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chatapp.realtimechat.dto.RegisterRequest;
import com.chatapp.realtimechat.dto.UserResponse;
import com.chatapp.realtimechat.model.User;
import com.chatapp.realtimechat.repository.UserRepository;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = normalize(request.email());
        userRepository.findByEmailIgnoreCase(email).ifPresent(u -> {
            throw new IllegalArgumentException("Email already registered: " + email);
        });
        User user = new User();
        user.setEmail(email);
        user.setOnline(false);
        return map(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getUsersExcluding(String email) {
        if (email == null || email.isBlank()) {
            return userRepository.findAllByOrderByEmailAsc().stream().map(this::map).toList();
        }
        return userRepository.findByEmailIgnoreCaseNotOrderByEmailAsc(normalize(email)).stream().map(this::map).toList();
    }

    @Transactional(readOnly = true)
    public User getByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(normalize(email))
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    @Transactional
    public void setOnline(String email, boolean online) {
        userRepository.findByEmailIgnoreCase(normalize(email)).ifPresent(user -> {
            user.setOnline(online);
            userRepository.save(user);
        });
    }

    private UserResponse map(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.isOnline());
    }

    private String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }
}
