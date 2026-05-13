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
```

### 2. Configure environment variables

**server/.env** (copy from server/.env.example)
```
PORT=4000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_service_role_key
CLIENT_URL=http://localhost:5173
```

**client/.env** (copy from client/.env.example)
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:4000
```

### 3. Run both servers

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open `http://localhost:5173`

---

## 📁 Project Structure

```
chat-app/
├── server/
│   └── index.js        # Express + Socket.io (all routes)
└── client/src/
    ├── pages/          # LoginPage, RegisterPage, ChatPage, ProfilePage
    ├── components/     # Sidebar, ChatWindow, Avatar
    ├── context/        # AuthContext, SocketContext
    └── lib/            # supabase.js, api.js
```

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
