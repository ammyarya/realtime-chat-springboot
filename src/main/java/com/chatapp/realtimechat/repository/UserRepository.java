package com.chatapp.realtimechat.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.chatapp.realtimechat.model.User;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    List<User> findByEmailIgnoreCaseNotOrderByEmailAsc(String email);
    List<User> findAllByOrderByEmailAsc();
}
