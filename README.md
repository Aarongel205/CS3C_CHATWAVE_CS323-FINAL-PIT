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

## ⚙️ Supabase Setup

### 1. Create a project at [supabase.com](https://supabase.com)

### 2. Disable email confirmation ⚠️ REQUIRED FIRST

Before running the SQL, go to your Supabase Dashboard:
**Authentication → Providers → Email → turn OFF "Confirm email" → Save**

This is required. Without it, newly registered users cannot log in.

### 3. Run this SQL in the **Supabase SQL Editor** (copy all at once):

```sql
-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;
create policy "Profiles viewable by all" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

-- Friend requests
create table public.friend_requests (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(sender_id, receiver_id)
);

alter table public.friend_requests enable row level security;
create policy "View own requests" on public.friend_requests for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Send requests" on public.friend_requests for insert with check (auth.uid() = sender_id);
create policy "Update requests" on public.friend_requests for update using (auth.uid() = receiver_id or auth.uid() = sender_id);
create policy "Delete requests" on public.friend_requests for delete using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Conversations (DMs and group chats)
create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  is_group boolean default false not null,
  group_name text,
  group_avatar text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.conversations enable row level security;
create policy "View own conversations" on public.conversations for select using (
  exists (select 1 from public.conversation_participants where conversation_id = id and user_id = auth.uid())
);
create policy "Create conversations" on public.conversations for insert with check (true);
create policy "Update conversations" on public.conversations for update using (
  exists (select 1 from public.conversation_participants where conversation_id = id and user_id = auth.uid() and role = 'admin')
);

-- Conversation participants (with role for group admin support)
create table public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text check (role in ('admin', 'member')) default 'member',
  primary key (conversation_id, user_id)
);

alter table public.conversation_participants enable row level security;
create policy "View participants" on public.conversation_participants for select using (
  exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid())
);
create policy "Insert participants" on public.conversation_participants for insert with check (true);
create policy "Delete participants" on public.conversation_participants for delete using (
  auth.uid() = user_id or
  exists (select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid() and cp.role = 'admin')
);

-- Messages
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;
create policy "View messages in own conversations" on public.messages for select using (
  exists (select 1 from public.conversation_participants where conversation_id = messages.conversation_id and user_id = auth.uid())
);
create policy "Send messages" on public.messages for insert with check (
  auth.uid() = sender_id and
  exists (select 1 from public.conversation_participants where conversation_id = messages.conversation_id and user_id = auth.uid())
);

-- Auto-create profile on signup (crash-proof version)
-- Handles duplicate usernames and never blocks auth signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  base_username text;
  final_username text;
  counter int := 0;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  );
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '_', 'g');
  if length(base_username) < 3 then
    base_username := 'user_' || base_username;
  end if;
  final_username := base_username;
  loop
    begin
      insert into public.profiles (id, username, display_name)
      values (
        new.id,
        final_username,
        coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), final_username)
      );
      exit;
    exception when unique_violation then
      counter := counter + 1;
      final_username := base_username || '_' || counter;
    end;
  end loop;
  return new;
exception when others then
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

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
