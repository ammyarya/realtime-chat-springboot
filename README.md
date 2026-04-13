# Realtime Chat (Spring Boot + WebSocket + MySQL)

Production-ready WhatsApp-like one-to-one chat built with Spring Boot 3, STOMP WebSocket and MySQL.

## Features
- Email-only registration with unique email
- Sidebar user list excluding current user
- Private one-to-one real-time chat
- Message persistence with sender, receiver, content, timestamp, status
- Status flow: SENT -> DELIVERED -> SEEN
- Chat history retrieval in chronological order
- Online/offline presence update via WebSocket connect/disconnect
- Auto-scroll UI with sender/receiver message styles
- CORS enabled, Render deployment ready

## Run Locally
1. Make sure MySQL is running.
2. Configure env vars (optional):
   - `DB_URL`
   - `DB_USERNAME`
   - `DB_PASSWORD`
3. Start app: `mvn spring-boot:run`
4. Open `http://localhost:8080`

## REST APIs
- `POST /api/users/register`
- `GET /api/users?currentEmail=you@example.com`
- `GET /api/messages/history?user1=a@example.com&user2=b@example.com`
- `PUT /api/messages/seen?viewer=a@example.com&friend=b@example.com`

## WebSocket
- Endpoint: `/ws` (SockJS)
- Send private message: `/app/chat.send`
- Delivered update: `/app/chat.delivered`
- User queues: `/user/queue/messages`, `/user/queue/status`
- Presence topic: `/topic/presence`

## Render Deploy
- Build: `mvn clean package`
- Start: `java -jar target/realtime-chat-1.0.0.jar`
- Env vars:
  - `PORT` (auto on Render)
  - `DB_URL`
  - `DB_USERNAME`
  - `DB_PASSWORD`
