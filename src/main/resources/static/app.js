const authModal = document.getElementById("authModal");
const emailInput = document.getElementById("emailInput");
const startBtn = document.getElementById("startBtn");
const authError = document.getElementById("authError");
const myEmailEl = document.getElementById("myEmail");
const userListEl = document.getElementById("userList");
const chatWithEl = document.getElementById("chatWith");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const connectionBadge = document.getElementById("connectionBadge");
const appEl = document.querySelector(".app");
const backBtn = document.getElementById("backBtn");
const emojiBtn = document.getElementById("emojiBtn");
const emojiPanel = document.getElementById("emojiPanel");
const emojiPicker = document.getElementById("emojiPicker");

let stompClient = null;
let currentUserEmail = localStorage.getItem("chatEmail") || "";
let activeFriend = null;
const chatCache = new Map();

if (currentUserEmail) {
    emailInput.value = currentUserEmail;
}

startBtn.addEventListener("click", registerAndStart);
sendBtn.addEventListener("click", sendMessage);
backBtn.addEventListener("click", () => appEl.classList.remove("mobile-chat-open"));

emojiBtn.addEventListener("click", () => {
    emojiPanel.classList.toggle("hidden");
});

document.addEventListener("click", (event) => {
    const insideEmoji = emojiPanel.contains(event.target) || emojiBtn.contains(event.target);
    if (!insideEmoji) {
        emojiPanel.classList.add("hidden");
    }
});

emojiPicker.addEventListener("emoji-click", (event) => {
    messageInput.value += event.detail.unicode;
    messageInput.focus();
});

messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

async function registerAndStart() {
    const email = emailInput.value.trim().toLowerCase();
    if (!email) {
        authError.textContent = "Email is required";
        return;
    }

    authError.textContent = "";

    try {
        await fetch("/api/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email })
        }).then(async (res) => {
            if (res.status === 201 || res.status === 200) return;
            if (res.status === 400) {
                const body = await res.json().catch(() => ({}));
                if (!String(body.error || "").toLowerCase().includes("already registered")) {
                    throw new Error(body.error || "Unable to register");
                }
                return;
            }
            throw new Error("Unable to register");
        });

        currentUserEmail = email;
        localStorage.setItem("chatEmail", email);
        myEmailEl.textContent = email;
        authModal.style.display = "none";

        await loadUsers();
        connectSocket();
        setInterval(loadUsers, 5000);
    } catch (err) {
        authError.textContent = err.message || "Unable to start chat";
    }
}

async function loadUsers() {
    if (!currentUserEmail) return;

    const users = await fetch(`/api/users?currentEmail=${encodeURIComponent(currentUserEmail)}`).then((r) => r.json());
    userListEl.innerHTML = "";

    users.forEach((user) => {
        const li = document.createElement("li");
        li.dataset.email = user.email;
        if (activeFriend === user.email) {
            li.classList.add("active");
        }

        li.innerHTML = `<span>${user.email}</span>
                        <span class="${user.online ? "online" : "offline"}">${user.online ? "online" : "offline"}</span>`;
        li.addEventListener("click", () => openChat(user.email));
        userListEl.appendChild(li);
    });
}

function connectSocket() {
    const socket = new SockJS(`/ws?email=${encodeURIComponent(currentUserEmail)}`);
    stompClient = Stomp.over(socket);
    stompClient.debug = () => {};

    stompClient.connect({}, () => {
        connectionBadge.textContent = "online";
        connectionBadge.className = "online";

        stompClient.subscribe("/user/queue/messages", (payload) => {
            const message = JSON.parse(payload.body);
            upsertMessage(message);

            const incomingForMe = message.receiver === currentUserEmail && message.sender !== currentUserEmail;
            if (incomingForMe) {
                stompClient.send("/app/chat.delivered", {}, JSON.stringify({ messageId: message.id }));
            }

            if (activeFriend && isInCurrentChat(message)) {
                renderMessages(activeFriend);
                if (incomingForMe) {
                    markSeen(activeFriend);
                }
            }
        });

        stompClient.subscribe("/user/queue/status", (payload) => {
            const update = JSON.parse(payload.body);
            updateMessageStatus(update.messageId, update.status);
            if (activeFriend) renderMessages(activeFriend);
        });

        stompClient.subscribe("/topic/presence", () => loadUsers());
    }, () => {
        connectionBadge.textContent = "offline";
        connectionBadge.className = "offline";
    });
}

async function openChat(friendEmail) {
    activeFriend = friendEmail;
    chatWithEl.textContent = friendEmail;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    emojiBtn.disabled = false;
    appEl.classList.add("mobile-chat-open");

    [...userListEl.querySelectorAll("li")].forEach((li) => {
        li.classList.toggle("active", li.dataset.email === friendEmail);
    });

    const history = await fetch(`/api/messages/history?user1=${encodeURIComponent(currentUserEmail)}&user2=${encodeURIComponent(friendEmail)}`).then((r) => r.json());
    history.forEach(upsertMessage);
    renderMessages(friendEmail);
    await markSeen(friendEmail);
}

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !activeFriend || !stompClient) return;

    stompClient.send("/app/chat.send", {}, JSON.stringify({ receiver: activeFriend, content }));
    messageInput.value = "";
    emojiPanel.classList.add("hidden");
}

function upsertMessage(message) {
    const key = chatKey(message.sender, message.receiver);
    const reverseKey = chatKey(message.receiver, message.sender);
    const bucketKey = chatCache.has(key) ? key : reverseKey;
    if (!chatCache.has(bucketKey)) chatCache.set(bucketKey, []);

    const bucket = chatCache.get(bucketKey);
    const idx = bucket.findIndex((m) => m.id === message.id);
    if (idx >= 0) {
        bucket[idx] = message;
    } else {
        bucket.push(message);
    }
    bucket.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function updateMessageStatus(messageId, status) {
    for (const [, messages] of chatCache) {
        const msg = messages.find((m) => m.id === messageId);
        if (msg) {
            msg.status = status;
            return;
        }
    }
}

function renderMessages(friendEmail) {
    const key = chatKey(currentUserEmail, friendEmail);
    const reverseKey = chatKey(friendEmail, currentUserEmail);
    const messages = chatCache.get(key) || chatCache.get(reverseKey) || [];

    messagesEl.innerHTML = "";
    messages.forEach((msg) => {
        const div = document.createElement("div");
        div.className = `message ${msg.sender === currentUserEmail ? "mine" : ""}`;

        const tick = msg.sender === currentUserEmail ? renderTick(msg.status) : "";
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        div.innerHTML = `
            <div>${escapeHtml(msg.content)}</div>
            <div class="meta">
                <span>${time}</span>
                <span class="${msg.status === "SEEN" ? "tick-seen" : ""}">${tick}</span>
            </div>
        `;
        messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderTick(status) {
    if (status === "SENT") return "✓";
    if (status === "DELIVERED") return "✓✓";
    if (status === "SEEN") return "✓✓";
    return "";
}

async function markSeen(friendEmail) {
    if (!currentUserEmail || !friendEmail) return;
    await fetch(`/api/messages/seen?viewer=${encodeURIComponent(currentUserEmail)}&friend=${encodeURIComponent(friendEmail)}`, {
        method: "PUT"
    });
}

function isInCurrentChat(message) {
    return (message.sender === currentUserEmail && message.receiver === activeFriend)
        || (message.sender === activeFriend && message.receiver === currentUserEmail);
}

function chatKey(user1, user2) {
    return [user1.toLowerCase(), user2.toLowerCase()].sort().join("::");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.innerText = text;
    return div.innerHTML;
}

if (currentUserEmail) {
    registerAndStart();
}
