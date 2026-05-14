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


Performance Testing — Apache JMeter
Performance at Scale
Our platform was put through rigorous load testing across 10,000 requests spanning 10 key operations and delivered a 0.00% error rate across the board. With an average response time of just 344ms and a total throughput of 151.9 requests/second, the system handles real-world demand with consistency and reliability. Peak loads reaching up to 24,592ms were absorbed without a single failure, demonstrating the robustness of our infrastructure under stress.
![Alt text](https://github.com/Aarongel205/CS3C_CHATWAVE_CS323-FINAL-PIT/blob/main/Performance%20Testing%20%E2%80%94%20Apache%20JMeter.jpg?raw=true)

















