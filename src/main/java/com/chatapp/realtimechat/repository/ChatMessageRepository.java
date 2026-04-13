package com.chatapp.realtimechat.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.chatapp.realtimechat.model.ChatMessage;
import com.chatapp.realtimechat.model.MessageStatus;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySenderEmailIgnoreCaseAndReceiverEmailIgnoreCaseOrSenderEmailIgnoreCaseAndReceiverEmailIgnoreCaseOrderByTimestampAsc(
            String sender1, String receiver1, String sender2, String receiver2);

    List<ChatMessage> findBySenderEmailIgnoreCaseAndReceiverEmailIgnoreCaseAndStatusIn(
            String sender, String receiver, List<MessageStatus> statuses);
}
