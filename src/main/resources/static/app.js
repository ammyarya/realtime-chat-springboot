const TOKEN_KEY = "chatToken";
const EMAIL_KEY = "chatEmail";

const authModal = document.getElementById("authModal");
const tabLogin = document.getElementById("tabLogin");
const tabSignup = document.getElementById("tabSignup");
const loginPanel = document.getElementById("loginPanel");
const signupPanel = document.getElementById("signupPanel");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginBtn = document.getElementById("loginBtn");
const nameInput = document.getElementById("nameInput");
const emailInput = document.getElementById("emailInput");
const signupPassword = document.getElementById("signupPassword");
const signupPassword2 = document.getElementById("signupPassword2");
const signupBtn = document.getElementById("signupBtn");
const authError = document.getElementById("authError");

const profileModal = document.getElementById("profileModal");
const profileNameInput = document.getElementById("profileNameInput");
const profileEmailReadonly = document.getElementById("profileEmailReadonly");
const currentPasswordInput = document.getElementById("currentPasswordInput");
const newPasswordInput = document.getElementById("newPasswordInput");
const profileSaveBtn = document.getElementById("profileSaveBtn");
const profileCancelBtn = document.getElementById("profileCancelBtn");
const changePasswordBtn = document.getElementById("changePasswordBtn");
const profileError = document.getElementById("profileError");

const myDisplayNameEl = document.getElementById("myDisplayName");
const myEmailEl = document.getElementById("myEmail");
const myAvatar = document.getElementById("myAvatar");
const chatHeaderAvatar = document.getElementById("chatHeaderAvatar");
const chatEmptyState = document.getElementById("chatEmptyState");
const profileBtn = document.getElementById("profileBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userSearch = document.getElementById("userSearch");
const userListEl = document.getElementById("userList");
const chatWithEl = document.getElementById("chatWith");
const chatWithSubEl = document.getElementById("chatWithSub");
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
let authToken = localStorage.getItem(TOKEN_KEY) || "";
let currentUserEmail = localStorage.getItem(EMAIL_KEY) || "";
let activeFriend = null;
let loadChatSeq = 0;
const chatCache = new Map();
/** @type {Map<string, string>} */
const displayNameByEmail = new Map();
/** @type {Map<string, { text: string, ts: string }>} friend email -> last msg preview */
const lastPreviewByEmail = new Map();
let allUsers = [];

function authHeaders(includeJsonContentType) {
    const h = { Authorization: `Bearer ${authToken}` };
    if (includeJsonContentType) h["Content-Type"] = "application/json";
    return h;
}

async function apiFetch(url, options = {}) {
    const jsonBody = options.body != null && typeof options.body === "string";
    const opts = {
        ...options,
        headers: { ...authHeaders(jsonBody), ...options.headers }
    };
    const res = await fetch(url, opts);
    if (res.status === 401) {
        clearSession();
        throw new Error("Session expired. Please log in again.");
    }
    return res;
}

let loadUsersIntervalId = null;

function clearLoadUsersInterval() {
    if (loadUsersIntervalId != null) {
        clearInterval(loadUsersIntervalId);
        loadUsersIntervalId = null;
    }
}

function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    authToken = "";
    currentUserEmail = "";
    authModal.style.display = "flex";
    authError.textContent = "";
}

function displayNameFor(email) {
    const key = email.toLowerCase();
    return displayNameByEmail.get(key) || emailLocalPart(email);
}

function emailLocalPart(email) {
    const at = email.indexOf("@");
    return at > 0 ? email.substring(0, at) : email;
}

function initialsFrom(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarGradient(email) {
    let h = 0;
    const s = String(email).toLowerCase();
    for (let i = 0; i < s.length; i++) {
        h = (h + s.charCodeAt(i) * 17) % 360;
    }
    return `linear-gradient(135deg, hsl(${h}, 58%, 46%) 0%, hsl(${(h + 40) % 360}, 48%, 34%) 100%)`;
}

function formatListTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
        d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function setMyProfileUI(displayName, email) {
    const dn = displayName || emailLocalPart(email);
    myDisplayNameEl.textContent = dn;
    myEmailEl.textContent = email;
    if (myAvatar) {
        myAvatar.textContent = initialsFrom(dn);
        myAvatar.style.background = avatarGradient(email);
    }
    displayNameByEmail.set(email.toLowerCase(), displayName || emailLocalPart(email));
}

function refreshChatSubtitle() {
    if (!activeFriend || !chatWithSubEl) return;
    const u = allUsers.find((x) => x.email === activeFriend);
    chatWithSubEl.classList.remove("hidden");
    if (u && u.online) {
        chatWithSubEl.textContent = "online";
        chatWithSubEl.classList.add("status-online");
    } else {
        chatWithSubEl.textContent = "offline";
        chatWithSubEl.classList.remove("status-online");
    }
}

tabLogin.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    loginPanel.classList.remove("hidden");
    signupPanel.classList.add("hidden");
    authError.textContent = "";
});

tabSignup.addEventListener("click", () => {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    signupPanel.classList.remove("hidden");
    loginPanel.classList.add("hidden");
    authError.textContent = "";
});

loginBtn.addEventListener("click", doLogin);
signupBtn.addEventListener("click", doSignup);

sendBtn.addEventListener("click", sendMessage);
backBtn.addEventListener("click", () => appEl.classList.remove("mobile-chat-open"));

profileBtn.addEventListener("click", openProfileModal);
profileCancelBtn.addEventListener("click", () => profileModal.classList.add("hidden"));
profileSaveBtn.addEventListener("click", saveProfile);
changePasswordBtn.addEventListener("click", changePassword);

logoutBtn.addEventListener("click", () => {
    clearSession();
    location.reload();
});

userSearch.addEventListener("input", () => renderUserList());

emojiBtn.addEventListener("click", () => {
    const willOpen = emojiPanel.classList.contains("hidden");
    emojiPanel.classList.toggle("hidden", !willOpen);
    emojiPanel.setAttribute("aria-hidden", willOpen ? "false" : "true");
    if (willOpen) {
        messageInput.blur();
    }
});

document.addEventListener("click", (event) => {
    const insideEmoji = emojiPanel.contains(event.target) || emojiBtn.contains(event.target);
    if (!insideEmoji) {
        emojiPanel.classList.add("hidden");
        emojiPanel.setAttribute("aria-hidden", "true");
    }
});

emojiPicker.addEventListener("emoji-click", (event) => {
    messageInput.value += event.detail.unicode;
    messageInput.focus();
});

messageInput.addEventListener("focus", () => {
    emojiPanel.classList.add("hidden");
    emojiPanel.setAttribute("aria-hidden", "true");
});

messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        sendMessage();
    }
});

function applyVisualViewport() {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const onChange = () => {
        const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
        document.documentElement.style.setProperty("--keyboard-offset", overlap > 48 ? `${overlap}px` : "0px");
    };
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    onChange();
}
applyVisualViewport();

async function doLogin() {
    const email = loginEmail.value.trim().toLowerCase();
    const password = loginPassword.value;
    authError.textContent = "";
    if (!email || !password) {
        authError.textContent = "Email and password are required";
        return;
    }
    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Login failed");
        authToken = body.token;
        currentUserEmail = body.user.email;
        localStorage.setItem(TOKEN_KEY, authToken);
        localStorage.setItem(EMAIL_KEY, currentUserEmail);
        setMyProfileUI(body.user.displayName, body.user.email);
        authModal.style.display = "none";
        await afterAuthBootstrap();
    } catch (e) {
        authError.textContent = e.message || "Login failed";
    }
}

async function doSignup() {
    const email = emailInput.value.trim().toLowerCase();
    const displayName = nameInput.value.trim();
    const password = signupPassword.value;
    const password2 = signupPassword2.value;
    authError.textContent = "";
    if (!email || !displayName) {
        authError.textContent = "Name and email are required";
        return;
    }
    if (password.length < 6) {
        authError.textContent = "Password must be at least 6 characters";
        return;
    }
    if (password !== password2) {
        authError.textContent = "Passwords do not match";
        return;
    }
    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, displayName, password })
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Registration failed");
        authToken = body.token;
        currentUserEmail = body.user.email;
        localStorage.setItem(TOKEN_KEY, authToken);
        localStorage.setItem(EMAIL_KEY, currentUserEmail);
        setMyProfileUI(body.user.displayName, body.user.email);
        authModal.style.display = "none";
        await afterAuthBootstrap();
    } catch (e) {
        authError.textContent = e.message || "Registration failed";
    }
}

async function afterAuthBootstrap() {
    await fetchMyProfile();
    await loadUsers();
    connectSocket();
    clearLoadUsersInterval();
    loadUsersIntervalId = setInterval(loadUsers, 5000);
}

async function fetchMyProfile() {
    const res = await apiFetch(`/api/users/me`);
    if (!res.ok) return;
    const me = await res.json();
    displayNameByEmail.set(me.email.toLowerCase(), me.displayName || emailLocalPart(me.email));
    setMyProfileUI(me.displayName, me.email);
}

async function openProfileModal() {
    profileError.textContent = "";
    profileError.style.color = "";
    currentPasswordInput.value = "";
    newPasswordInput.value = "";
    profileEmailReadonly.value = currentUserEmail;
    try {
        const res = await apiFetch(`/api/users/me`);
        if (!res.ok) throw new Error("Could not load profile");
        const me = await res.json();
        profileNameInput.value = me.displayName || "";
    } catch {
        profileNameInput.value = displayNameFor(currentUserEmail);
    }
    profileModal.classList.remove("hidden");
    profileNameInput.focus();
}

async function saveProfile() {
    profileError.textContent = "";
    const name = profileNameInput.value.trim();
    if (!name) {
        profileError.textContent = "Name is required";
        return;
    }
    try {
        const res = await apiFetch("/api/users/profile", {
            method: "PUT",
            body: JSON.stringify({ displayName: name })
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Save failed");
        }
        const me = await res.json();
        setMyProfileUI(me.displayName, me.email);
        profileModal.classList.add("hidden");
        await loadUsers();
        if (activeFriend) {
            chatWithEl.textContent = displayNameFor(activeFriend);
        }
    } catch (e) {
        profileError.textContent = e.message || "Save failed";
    }
}

async function changePassword() {
    profileError.textContent = "";
    profileError.style.color = "";
    const cur = currentPasswordInput.value;
    const neu = newPasswordInput.value;
    if (!cur || !neu) {
        profileError.textContent = "Enter current and new password";
        return;
    }
    if (neu.length < 6) {
        profileError.textContent = "New password must be at least 6 characters";
        return;
    }
    try {
        const res = await apiFetch("/api/auth/password", {
            method: "PUT",
            body: JSON.stringify({ currentPassword: cur, newPassword: neu })
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || "Could not change password");
        }
        currentPasswordInput.value = "";
        newPasswordInput.value = "";
        profileError.textContent = "Password updated.";
        profileError.style.color = "#8af1d5";
    } catch (e) {
        profileError.textContent = e.message || "Could not change password";
    }
}

function updateLastPreview(msg) {
    const a = msg.sender.toLowerCase();
    const b = msg.receiver.toLowerCase();
    const me = currentUserEmail.toLowerCase();
    const other = a === me ? b : a;
    const text = (msg.content || "").replace(/\s+/g, " ").trim();
    lastPreviewByEmail.set(other, {
        text: text.length > 72 ? `${text.slice(0, 72)}…` : text,
        ts: msg.timestamp
    });
}

function renderUserList() {
    const q = (userSearch.value || "").trim().toLowerCase();
    userListEl.innerHTML = "";

    let filtered = q
        ? allUsers.filter((u) => {
              const name = (u.displayName || "").toLowerCase();
              const em = u.email.toLowerCase();
              return name.includes(q) || em.includes(q);
          })
        : [...allUsers];

    filtered.sort((u1, u2) => {
        const p1 = lastPreviewByEmail.get(u1.email.toLowerCase());
        const p2 = lastPreviewByEmail.get(u2.email.toLowerCase());
        const t1 = p1 ? new Date(p1.ts).getTime() : 0;
        const t2 = p2 ? new Date(p2.ts).getTime() : 0;
        return t2 - t1;
    });

    filtered.forEach((user) => {
        const li = document.createElement("li");
        li.dataset.email = user.email;
        const dn = user.displayName || emailLocalPart(user.email);
        displayNameByEmail.set(user.email.toLowerCase(), dn);

        if (activeFriend === user.email) {
            li.classList.add("active");
        }

        const prev = lastPreviewByEmail.get(user.email.toLowerCase());
        const sub = prev
            ? `<span class="user-list-preview">${escapeHtml(prev.text)}</span>`
            : `<span class="user-list-preview muted-preview">${user.online ? "online" : "tap to chat"}</span>`;

        const timeStr = prev ? formatListTime(prev.ts) : "";
        const avStyle = `background:${avatarGradient(user.email)}`;

        li.innerHTML = `
            <div class="user-list-avatar avatar" style="${avStyle}">${escapeHtml(initialsFrom(dn))}</div>
            <div class="user-list-main">
                <span class="user-list-name">${escapeHtml(dn)}</span>
                ${sub}
            </div>
            <div class="user-list-side">
                ${timeStr ? `<span class="user-list-time">${escapeHtml(timeStr)}</span>` : ""}
                <span class="presence-dot ${user.online ? "online" : ""}" title="${user.online ? "online" : "offline"}"></span>
            </div>`;
        li.addEventListener("click", () => openChat(user.email));
        userListEl.appendChild(li);
    });
    refreshChatSubtitle();
}

async function loadUsers() {
    if (!currentUserEmail || !authToken) return;

    const res = await apiFetch(`/api/users`);
    if (!res.ok) return;
    const users = await res.json();
    allUsers = users;
    renderUserList();
}

function connectSocket() {
    if (!authToken) return;
    if (stompClient) {
        try {
            stompClient.disconnect();
        } catch (e) {
            /* ignore */
        }
        stompClient = null;
    }
    const socket = new SockJS(`/ws?token=${encodeURIComponent(authToken)}`);
    stompClient = Stomp.over(socket);
    stompClient.debug = () => {};

    stompClient.connect({}, () => {
        connectionBadge.textContent = "online";
        connectionBadge.className = "status-pill online";

        stompClient.subscribe("/user/queue/messages", (payload) => {
            const message = JSON.parse(payload.body);
            upsertMessage(message);
            updateLastPreview(message);

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
            renderUserList();
        });

        stompClient.subscribe("/user/queue/status", (payload) => {
            const update = JSON.parse(payload.body);
            updateMessageStatus(update.messageId, update.status);
            if (activeFriend) renderMessages(activeFriend);
        });

        stompClient.subscribe("/topic/presence", (payload) => {
            const u = JSON.parse(payload.body);
            if (u && u.email) {
                displayNameByEmail.set(u.email.toLowerCase(), u.displayName || emailLocalPart(u.email));
            }
            loadUsers();
        });
    }, () => {
        connectionBadge.textContent = "offline";
        connectionBadge.className = "status-pill offline";
    });
}

async function openChat(friendEmail) {
    const seq = ++loadChatSeq;
    activeFriend = friendEmail;

    if (chatEmptyState) chatEmptyState.classList.add("hidden");
    if (chatHeaderAvatar) {
        chatHeaderAvatar.classList.remove("hidden");
        const dn = displayNameFor(friendEmail);
        chatHeaderAvatar.textContent = initialsFrom(dn);
        chatHeaderAvatar.style.background = avatarGradient(friendEmail);
    }
    chatWithEl.textContent = displayNameFor(friendEmail);
    chatWithEl.title = friendEmail;
    refreshChatSubtitle();

    messageInput.disabled = false;
    sendBtn.disabled = false;
    emojiBtn.disabled = false;
    appEl.classList.add("mobile-chat-open");

    messagesEl.innerHTML = "";
    messagesEl.classList.add("loading");

    [...userListEl.querySelectorAll("li")].forEach((li) => {
        li.classList.toggle("active", li.dataset.email === friendEmail);
    });

    emojiPanel.classList.add("hidden");
    emojiPanel.setAttribute("aria-hidden", "true");

    try {
        const history = await apiFetch(
            `/api/messages/history?user1=${encodeURIComponent(currentUserEmail)}&user2=${encodeURIComponent(friendEmail)}`
        ).then((r) => r.json());

        if (seq !== loadChatSeq) return;

        messagesEl.classList.remove("loading");
        history.forEach((m) => {
            upsertMessage(m);
            updateLastPreview(m);
        });
        renderMessages(friendEmail);
        await markSeen(friendEmail);
        renderUserList();
    } catch {
        if (seq !== loadChatSeq) return;
        messagesEl.classList.remove("loading");
    }
}

function sendMessage() {
    const content = messageInput.value.trim();
    if (!content || !activeFriend || !stompClient) return;

    stompClient.send("/app/chat.send", {}, JSON.stringify({ receiver: activeFriend, content }));
    messageInput.value = "";
    emojiPanel.classList.add("hidden");
    emojiPanel.setAttribute("aria-hidden", "true");
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
        const mine = msg.sender === currentUserEmail;
        const row = document.createElement("div");
        row.className = `message-row ${mine ? "mine" : "theirs"}`;

        const tick = mine ? renderTick(msg.status) : "";
        const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        const bubble = document.createElement("div");
        bubble.className = `message-bubble ${mine ? "mine" : "theirs"}`;
        bubble.innerHTML = `
            <p class="bubble-text">${escapeHtml(msg.content)}</p>
            <div class="meta">
                <span>${time}</span>
                ${mine ? `<span class="${msg.status === "SEEN" ? "tick-seen" : ""}">${tick}</span>` : ""}
            </div>
        `;
        row.appendChild(bubble);
        messagesEl.appendChild(row);
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
    await apiFetch(
        `/api/messages/seen?viewer=${encodeURIComponent(currentUserEmail)}&friend=${encodeURIComponent(friendEmail)}`,
        { method: "PUT" }
    );
}

function isInCurrentChat(message) {
    return (
        (message.sender === currentUserEmail && message.receiver === activeFriend) ||
        (message.sender === activeFriend && message.receiver === currentUserEmail)
    );
}

function chatKey(user1, user2) {
    return [user1.toLowerCase(), user2.toLowerCase()].sort().join("::");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.innerText = text;
    return div.innerHTML;
}

async function resumeSession() {
    if (!authToken || !currentUserEmail) {
        if (currentUserEmail) loginEmail.value = currentUserEmail;
        return;
    }
    loginEmail.value = currentUserEmail;
    try {
        await fetchMyProfile();
        authModal.style.display = "none";
        await afterAuthBootstrap();
    } catch {
        clearSession();
    }
}

if (authToken && currentUserEmail) {
    resumeSession();
} else if (currentUserEmail) {
    loginEmail.value = currentUserEmail;
}
