# 💬 ChatWave — Real-Time Chat App

Full-stack real-time chat with friends system and group chats built on **React + Express + Supabase + Socket.io**.

---

## 🏗️ Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Express.js + Socket.io
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Real-time**: Socket.io

---
## 🚀 Local Development

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install

### 2. Run both servers

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open `http://localhost:5173`

---

## ✨ Features

- 🔐 Auth (register / login / logout via Supabase)
- 👤 User profiles (editable display name, bio, avatar)
- 🔍 Search users by username
- 🤝 Friend requests (send / accept / decline)
- 💬 1-on-1 DM conversations
- 👥 Group chats (create, add/remove members, admin roles)
- ⚡ Real-time messaging via Socket.io
- ⌨️  Typing indicators
- 🟢 Online presence
- 💾 All messages persisted in Supabase
