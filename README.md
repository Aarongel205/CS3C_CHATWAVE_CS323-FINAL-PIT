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


📊 Performance & Stress Testing 
To ensure ChatWave can handle real-world scale, we conducted a rigorous stress test using Apache JMeter. We simulated a high-concurrency environment to evaluate how the system performs under significant load.  Test ConfigurationSimulated Users: 1,000 concurrent users.  Total Requests: 10,000 requests distributed across 9 key API endpoints.  Scenario: The test covered a complete user journey, including authentication, social interactions, real-time messaging, and profile management.

Metric,Result,Interpretation
Error Rate,0.00%,The system maintained perfect stability with zero failed requests under full load. 
Average Response Time,253 ms,"Typical user requests were processed in under 300ms, ensuring a ""snappy"" experience. 
Throughput,127.3 req/sec,The system successfully managed over 127 transactions every second. 
Network Efficiency,103.2 KB/s,"Data flow remained optimized, with the largest payloads occurring during conversation fetches.



















