package com.chatapp.realtimechat.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.chatapp.realtimechat.dto.ChatMessageRequest;
import com.chatapp.realtimechat.dto.ChatMessageResponse;
import com.chatapp.realtimechat.dto.StatusUpdateResponse;
import com.chatapp.realtimechat.model.ChatMessage;
import com.chatapp.realtimechat.model.MessageStatus;
import com.chatapp.realtimechat.model.User;
import com.chatapp.realtimechat.repository.ChatMessageRepository;

@Service
public class ChatService {
    private final ChatMessageRepository chatMessageRepository;
    private final UserService userService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatService(ChatMessageRepository chatMessageRepository, UserService userService, SimpMessagingTemplate messagingTemplate) {
        this.chatMessageRepository = chatMessageRepository;
        this.userService = userService;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public ChatMessageResponse saveAndDispatch(String senderEmail, ChatMessageRequest request) {
        User sender = userService.getByEmail(senderEmail);
        User receiver = userService.getByEmail(request.receiver());

        ChatMessage message = new ChatMessage();
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(request.content().trim());
        message.setTimestamp(LocalDateTime.now());
        message.setStatus(MessageStatus.SENT);

        ChatMessage saved = chatMessageRepository.save(message);
        ChatMessageResponse response = map(saved);

        messagingTemplate.convertAndSendToUser(receiver.getEmail(), "/queue/messages", response);
        messagingTemplate.convertAndSendToUser(sender.getEmail(), "/queue/messages", response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> history(String user1, String user2) {
        return chatMessageRepository
                .findBySenderEmailIgnoreCaseAndReceiverEmailIgnoreCaseOrSenderEmailIgnoreCaseAndReceiverEmailIgnoreCaseOrderByTimestampAsc(
                        normalize(user1), normalize(user2), normalize(user2), normalize(user1))
                .stream().map(this::map).toList();
    }

    @Transactional
    public void markDelivered(Long messageId, String receiverEmail) {
        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Message not found: " + messageId));

        if (!message.getReceiver().getEmail().equalsIgnoreCase(receiverEmail)) return;

        if (message.getStatus() == MessageStatus.SENT) {
            message.setStatus(MessageStatus.DELIVERED);
            chatMessageRepository.save(message);
            StatusUpdateResponse update = new StatusUpdateResponse(message.getId(), MessageStatus.DELIVERED);
            messagingTemplate.convertAndSendToUser(message.getSender().getEmail(), "/queue/status", update);
            messagingTemplate.convertAndSendToUser(message.getReceiver().getEmail(), "/queue/status", update);
        }
    }

    @Transactional
    public void markSeenForChat(String viewerEmail, String friendEmail) {
        List<ChatMessage> messages = chatMessageRepository.findBySenderEmailIgnoreCaseAndReceiverEmailIgnoreCaseAndStatusIn(
                normalize(friendEmail), normalize(viewerEmail), List.of(MessageStatus.SENT, MessageStatus.DELIVERED));

        for (ChatMessage message : messages) {
            message.setStatus(MessageStatus.SEEN);
            StatusUpdateResponse update = new StatusUpdateResponse(message.getId(), MessageStatus.SEEN);
            messagingTemplate.convertAndSendToUser(message.getSender().getEmail(), "/queue/status", update);
            messagingTemplate.convertAndSendToUser(message.getReceiver().getEmail(), "/queue/status", update);
        }
        if (!messages.isEmpty()) chatMessageRepository.saveAll(messages);
    }

    private ChatMessageResponse map(ChatMessage message) {
        return new ChatMessageResponse(message.getId(), message.getSender().getEmail(), message.getReceiver().getEmail(),
                message.getContent(), message.getTimestamp(), message.getStatus());
    }

    private String normalize(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }
}
