package com.chatapp.realtimechat.service;

import java.util.List;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chatapp.realtimechat.dto.AuthResponse;
import com.chatapp.realtimechat.dto.LoginRequest;
import com.chatapp.realtimechat.dto.PasswordChangeRequest;
import com.chatapp.realtimechat.dto.ProfileUpdateRequest;
import com.chatapp.realtimechat.dto.RegisterRequest;
import com.chatapp.realtimechat.dto.UserResponse;
import com.chatapp.realtimechat.model.User;
import com.chatapp.realtimechat.repository.UserRepository;
import com.chatapp.realtimechat.security.JwtService;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalize(request.email());
        Optional<User> existing = userRepository.findByEmailIgnoreCase(email);
        if (existing.isPresent()) {
            User u = existing.get();
            if (u.getPasswordHash() == null || u.getPasswordHash().isBlank()) {
                u.setPasswordHash(passwordEncoder.encode(request.password()));
                u.setDisplayName(resolveDisplayNameFromRequest(email, request.displayName()));
                userRepository.save(u);
                return new AuthResponse(jwtService.createToken(email), map(u));
            }
            throw new IllegalArgumentException("Email already registered");
        }
        User user = new User();
        user.setEmail(email);
        user.setDisplayName(resolveDisplayNameFromRequest(email, request.displayName()));
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setOnline(false);
        return new AuthResponse(jwtService.createToken(email), map(userRepository.save(user)));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(normalize(request.email()))
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }
        return new AuthResponse(jwtService.createToken(user.getEmail()), map(user));
    }

    @Transactional
    public void changePassword(String email, PasswordChangeRequest request) {
        User user = getByEmail(email);
        if (user.getPasswordHash() == null || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getProfile(String email) {
        return map(getByEmail(normalize(email)));
    }

    @Transactional
    public UserResponse updateProfile(String email, ProfileUpdateRequest request) {
        User user = getByEmail(normalize(email));
        user.setDisplayName(request.displayName().trim());
        return map(userRepository.save(user));
    }

    public String resolveDisplayName(User user) {
        String d = user.getDisplayName();
        if (d != null && !d.isBlank()) {
            return d.trim();
        }
        return emailLocalPart(user.getEmail());
    }

    private String resolveDisplayNameFromRequest(String email, String requestedName) {
        if (requestedName != null && !requestedName.isBlank()) {
            return requestedName.trim();
        }
        return emailLocalPart(email);
    }

    private String emailLocalPart(String email) {
        int at = email.indexOf('@');
        return at > 0 ? email.substring(0, at) : email;
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
        return new UserResponse(user.getId(), user.getEmail(), resolveDisplayName(user), user.isOnline());
    }

    private String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }
}
