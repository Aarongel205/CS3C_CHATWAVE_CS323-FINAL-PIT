import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());

// ─── Auth Middleware ───────────────────────────────────────────────────────────
// Cache token lookups to avoid calling Supabase on every request under load
const tokenCache = new Map(); // token -> { user, expiresAt }
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });

  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    return next();
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Invalid token" });

  tokenCache.set(token, { user, expiresAt: Date.now() + CACHE_TTL });
  req.user = user;
  next();
};

// ─── Profile ──────────────────────────────────────────────────────────────────

// Helper: ensure profile exists — creates it if the DB trigger silently failed
async function ensureProfile(userId, email, meta = {}) {
  const { data: existing } = await supabase
    .from("profiles").select("*").eq("id", userId).maybeSingle();
  if (existing) return existing;

  let baseUsername = (meta.username || email?.split("@")[0] || "user")
    .replace(/[^a-zA-Z0-9_]/g, "_");
  if (baseUsername.length < 3) baseUsername = "user_" + baseUsername;

  let username = baseUsername;
  let attempt = 0;
  while (attempt < 20) {
    const { data, error } = await supabase.from("profiles")
      .insert({ id: userId, username, display_name: meta.display_name || meta.username || username })
      .select().single();
    if (!error) return data;
    if (error.code === "23505") { attempt++; username = baseUsername + "_" + attempt; }
    else { console.error("ensureProfile:", error.message); return null; }
  }
  return null;
}

// Called right after login — guarantees the profile row exists
app.post("/api/auth/ensure-profile", auth, async (req, res) => {
  try {
    const { username, display_name } = req.body || {};
    const profile = await ensureProfile(req.user.id, req.user.email, { username, display_name });
    if (!profile) return res.status(500).json({ error: "Could not create profile" });
    res.json(profile);
  } catch (err) {
    console.error("ensure-profile:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/profile/me", auth, async (req, res) => {
  // Auto-create if trigger failed — never return 404 for the auth'd user
  const profile = await ensureProfile(req.user.id, req.user.email, {});
  if (!profile) return res.status(500).json({ error: "Could not load profile" });
  res.json(profile);
});

app.get("/api/profile/:id", auth, async (req, res) => {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", req.params.id).single();
  if (error) return res.status(404).json({ error: "User not found" });
  res.json(data);
});

app.patch("/api/profile", auth, async (req, res) => {
  const { display_name, bio, avatar_url } = req.body;
  const { data, error } = await supabase.from("profiles")
    .update({ display_name, bio, avatar_url }).eq("id", req.user.id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.get("/api/users/search", auth, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);
  const { data, error } = await supabase.from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .ilike("username", `%${q}%`).neq("id", req.user.id).limit(10);
  if (error) return res.status(400).json({ error: error.message });

  // Enrich each user with current friend/request status
  const enriched = await Promise.all(data.map(async (user) => {
    const { data: fr } = await supabase.from("friend_requests")
      .select("id, status, sender_id")
      .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${req.user.id})`)
      .maybeSingle();
    let friendStatus = "none";
    let requestId = null;
    if (fr) {
      if (fr.status === "accepted") friendStatus = "friends";
      else if (fr.status === "pending" && fr.sender_id === req.user.id) { friendStatus = "pending_sent"; requestId = fr.id; }
      else if (fr.status === "pending" && fr.sender_id !== req.user.id) friendStatus = "pending_received";
      else friendStatus = fr.status; // declined, unfriended
    }
    return { ...user, friendStatus, requestId };
  }));

  res.json(enriched);
});

// ─── Friends ──────────────────────────────────────────────────────────────────
app.get("/api/friends", auth, async (req, res) => {
  const { data, error } = await supabase.from("friend_requests")
    .select(`id, status, created_at,
      sender:sender_id(id, username, display_name, avatar_url),
      receiver:receiver_id(id, username, display_name, avatar_url)`)
    .eq("status", "accepted")
    .or(`sender_id.eq.${req.user.id},receiver_id.eq.${req.user.id}`);
  if (error) return res.status(400).json({ error: error.message });
  res.json(data.map(fr => ({
    requestId: fr.id,
    friend: fr.sender.id === req.user.id ? fr.receiver : fr.sender,
  })));
});

app.get("/api/friends/requests", auth, async (req, res) => {
  const { data, error } = await supabase.from("friend_requests")
    .select(`id, status, created_at, sender:sender_id(id, username, display_name, avatar_url)`)
    .eq("receiver_id", req.user.id).eq("status", "pending");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.get("/api/friends/sent", auth, async (req, res) => {
  const { data, error } = await supabase.from("friend_requests")
    .select(`id, status, created_at, receiver:receiver_id(id, username, display_name, avatar_url)`)
    .eq("sender_id", req.user.id).eq("status", "pending");
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

app.post("/api/friends/request", auth, async (req, res) => {
  const { receiver_id } = req.body;
  const { data: existing } = await supabase.from("friend_requests")
    .select("id, status, sender_id")
    .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${req.user.id})`)
    .maybeSingle();

  // If a row exists and was unfriended or declined, reset it to a new pending request
  if (existing && (existing.status === "unfriended" || existing.status === "declined")) {
    // Always make the current user the sender of the new request
    const { data, error } = await supabase.from("friend_requests")
      .update({ status: "pending", sender_id: req.user.id, receiver_id })
      .eq("id", existing.id)
      .select(`id, status, sender:sender_id(id, username, display_name, avatar_url)`).single();
    if (error) return res.status(400).json({ error: error.message });
    io.to(`user:${receiver_id}`).emit("friend_request", data);
    return res.json(data);
  }

  if (existing) return res.status(400).json({ error: "Request already exists" });

  const { data, error } = await supabase.from("friend_requests")
    .insert({ sender_id: req.user.id, receiver_id })
    .select(`id, status, sender:sender_id(id, username, display_name, avatar_url)`).single();
  if (error) return res.status(400).json({ error: error.message });
  io.to(`user:${receiver_id}`).emit("friend_request", data);
  res.json(data);
});

// Cancel a sent friend request (sender withdraws their own pending request)
app.patch("/api/friends/request/:id/cancel", auth, async (req, res) => {
  const { data, error } = await supabase.from("friend_requests")
    .update({ status: "declined" }).eq("id", req.params.id).eq("sender_id", req.user.id).eq("status", "pending")
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  // Notify the receiver in real-time so their pending list updates instantly
  io.to(`user:${data.receiver_id}`).emit("friend_request_cancelled", { request_id: data.id, sender_id: req.user.id });
  res.json(data);
});

app.patch("/api/friends/request/:id/accept", auth, async (req, res) => {
  const { data, error } = await supabase.from("friend_requests")
    .update({ status: "accepted" }).eq("id", req.params.id).eq("receiver_id", req.user.id)
    .select(`id, status,
      sender:sender_id(id, username, display_name, avatar_url),
      receiver:receiver_id(id, username, display_name, avatar_url)`).single();
  if (error) return res.status(400).json({ error: error.message });
  io.to(`user:${data.sender.id}`).emit("friend_accepted", data);
  res.json(data);
});

app.patch("/api/friends/request/:id/decline", auth, async (req, res) => {
  const { data, error } = await supabase.from("friend_requests")
    .update({ status: "declined" }).eq("id", req.params.id).eq("receiver_id", req.user.id)
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  io.to(`user:${data.sender_id}`).emit("friend_declined", { request_id: data.id, receiver_id: req.user.id });
  res.json(data);
});

app.delete("/api/friends/:requestId", auth, async (req, res) => {
  const { error } = await supabase.from("friend_requests").delete().eq("id", req.params.requestId);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// Unfriend — sets status to "unfriended" so conversation history is preserved
// but messaging is blocked between the two users
app.patch("/api/friends/:requestId/unfriend", auth, async (req, res) => {
  // Verify the requester is one of the two parties
  const { data: fr } = await supabase.from("friend_requests")
    .select("id, sender_id, receiver_id")
    .eq("id", req.params.requestId)
    .maybeSingle();
  if (!fr) return res.status(404).json({ error: "Friend relationship not found" });
  if (fr.sender_id !== req.user.id && fr.receiver_id !== req.user.id)
    return res.status(403).json({ error: "Not authorized" });

  const { data, error } = await supabase.from("friend_requests")
    .update({ status: "unfriended" })
    .eq("id", req.params.requestId)
    .select().single();
  if (error) return res.status(400).json({ error: error.message });

  // Notify both parties in real-time
  const otherId = fr.sender_id === req.user.id ? fr.receiver_id : fr.sender_id;
  io.to(`user:${otherId}`).emit("friend_unfriended", { request_id: req.params.requestId, by: req.user.id });
  io.to(`user:${req.user.id}`).emit("friend_unfriended", { request_id: req.params.requestId, by: req.user.id });

  res.json(data);
});

// Check if two users are currently friends (status === "accepted")
app.get("/api/friends/status/:userId", auth, async (req, res) => {
  const { data } = await supabase.from("friend_requests")
    .select("id, status")
    .or(`and(sender_id.eq.${req.user.id},receiver_id.eq.${req.params.userId}),and(sender_id.eq.${req.params.userId},receiver_id.eq.${req.user.id})`)
    .maybeSingle();
  res.json({ status: data?.status || "none", request_id: data?.id || null });
});

// ─── Conversations ────────────────────────────────────────────────────────────

// Get or create a DM conversation — simple, no broken joins
app.post("/api/conversations", auth, async (req, res) => {
  const { friend_id } = req.body;
  if (!friend_id) return res.status(400).json({ error: "friend_id required" });

  try {
    // Step 1: get all conversation IDs this user is in
    const { data: myParts, error: e1 } = await supabase
      .from("conversation_participants").select("conversation_id").eq("user_id", req.user.id);
    if (e1) return res.status(400).json({ error: e1.message });

    const myIds = (myParts || []).map(p => p.conversation_id);

    // Step 2: find a DM conversation (not a group) that friend is also in
    if (myIds.length > 0) {
      const { data: shared, error: e2 } = await supabase
        .from("conversation_participants").select("conversation_id")
        .eq("user_id", friend_id).in("conversation_id", myIds);
      if (!e2 && shared && shared.length > 0) {
        const sharedIds = shared.map(s => s.conversation_id);
        // Only consider non-group (DM) conversations
        const { data: dmConvos } = await supabase
          .from("conversations").select("id").in("id", sharedIds).eq("is_group", false);
        if (dmConvos && dmConvos.length > 0) {
          // Find the one with exactly 2 participants (true 1-on-1 DM)
          for (const dmConvo of dmConvos) {
            const { data: parts } = await supabase
              .from("conversation_participants").select("user_id").eq("conversation_id", dmConvo.id);
            if (parts && parts.length === 2) {
              return res.json({ conversation_id: dmConvo.id });
            }
          }
        }
      }
    }

    // Step 3: create new conversation
    const { data: convo, error: e3 } = await supabase
      .from("conversations").insert({ is_group: false }).select().single();
    if (e3) return res.status(400).json({ error: e3.message });

    // Step 4: add both participants
    const { error: e4 } = await supabase.from("conversation_participants").insert([
      { conversation_id: convo.id, user_id: req.user.id, role: "member" },
      { conversation_id: convo.id, user_id: friend_id, role: "member" },
    ]);
    if (e4) return res.status(400).json({ error: e4.message });

    // Notify the friend they have a new conversation
    io.to(`user:${friend_id}`).emit("new_conversation", { conversation_id: convo.id });

    res.json({ conversation_id: convo.id });
  } catch (err) {
    console.error("POST /api/conversations error:", err);
    res.status(500).json({ error: err.message });
  }
});

// List all conversations for the current user
app.get("/api/conversations", auth, async (req, res) => {
  try {
    const { data: myParts, error: e1 } = await supabase
      .from("conversation_participants").select("conversation_id, role").eq("user_id", req.user.id);
    if (e1) return res.status(400).json({ error: e1.message });
    if (!myParts || myParts.length === 0) return res.json([]);

    const convoIds = myParts.map(p => p.conversation_id);
    const myRoleMap = Object.fromEntries(myParts.map(p => [p.conversation_id, p.role]));

    // Get conversation metadata
    const { data: convos } = await supabase.from("conversations").select("*").in("id", convoIds);

    // Get all participants with profiles
    const { data: allParts } = await supabase.from("conversation_participants")
      .select("conversation_id, user_id, role, profiles:user_id(id, username, display_name, avatar_url)")
      .in("conversation_id", convoIds);

    // Get last message per conversation
    const lastMessages = await Promise.all(convoIds.map(async id => {
      const { data } = await supabase.from("messages")
        .select("content, created_at, sender_id").eq("conversation_id", id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      return { id, last_message: data || null };
    }));
    const lastMsgMap = Object.fromEntries(lastMessages.map(x => [x.id, x.last_message]));

    const result = convoIds.map(id => {
      const convo = convos?.find(c => c.id === id) || {};
      const parts = (allParts || []).filter(p => p.conversation_id === id);
      const others = parts.filter(p => p.user_id !== req.user.id);
      return {
        id,
        is_group: convo.is_group || false,
        group_name: convo.group_name || null,
        group_avatar: convo.group_avatar || null,
        created_by: convo.created_by || null,
        other_user: !convo.is_group ? (others[0]?.profiles || null) : null,
        members: convo.is_group ? parts.map(p => ({ ...p.profiles, role: p.role })) : null,
        last_message: lastMsgMap[id],
        my_role: myRoleMap[id] || "member",
      };
    });

    result.sort((a, b) => {
      if (!a.last_message) return 1;
      if (!b.last_message) return -1;
      return new Date(b.last_message.created_at) - new Date(a.last_message.created_at);
    });

    res.json(result);
  } catch (err) {
    console.error("GET /api/conversations error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get a single conversation's metadata
app.get("/api/conversations/:id", auth, async (req, res) => {
  const { id } = req.params;
  try {
    // Verify participant
    const { data: me } = await supabase.from("conversation_participants")
      .select("role").eq("conversation_id", id).eq("user_id", req.user.id).maybeSingle();
    if (!me) return res.status(403).json({ error: "Not a participant" });

    const { data: convo } = await supabase.from("conversations").select("*").eq("id", id).single();
    const { data: parts } = await supabase.from("conversation_participants")
      .select("user_id, role, profiles:user_id(id, username, display_name, avatar_url)")
      .eq("conversation_id", id);

    const others = (parts || []).filter(p => p.user_id !== req.user.id);
    res.json({
      id,
      is_group: convo?.is_group || false,
      group_name: convo?.group_name || null,
      group_avatar: convo?.group_avatar || null,
      other_user: !convo?.is_group ? (others[0]?.profiles || null) : null,
      members: convo?.is_group ? parts.map(p => ({ ...p.profiles, role: p.role })) : null,
      my_role: me.role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages
app.get("/api/conversations/:id/messages", auth, async (req, res) => {
  const { id } = req.params;
  const { limit = 50, before } = req.query;
  const { data: me } = await supabase.from("conversation_participants")
    .select("conversation_id").eq("conversation_id", id).eq("user_id", req.user.id).maybeSingle();
  if (!me) return res.status(403).json({ error: "Not a participant" });

  let q = supabase.from("messages")
    .select(`id, content, created_at, sender:sender_id(id, username, display_name, avatar_url)`)
    .eq("conversation_id", id).order("created_at", { ascending: false }).limit(parseInt(limit));
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) return res.status(400).json({ error: error.message });
  res.json((data || []).reverse());
});

// ─── Groups ───────────────────────────────────────────────────────────────────
app.post("/api/groups", auth, async (req, res) => {
  const { name, member_ids, avatar_url } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Group name required" });
  if (!member_ids?.length) return res.status(400).json({ error: "Add at least one member" });

  const { data: convo, error: e1 } = await supabase.from("conversations")
    .insert({ is_group: true, group_name: name.trim(), group_avatar: avatar_url || null, created_by: req.user.id })
    .select().single();
  if (e1) return res.status(400).json({ error: e1.message });

  const { error: e2 } = await supabase.from("conversation_participants").insert([
    { conversation_id: convo.id, user_id: req.user.id, role: "admin" },
    ...member_ids.map(id => ({ conversation_id: convo.id, user_id: id, role: "member" })),
  ]);
  if (e2) return res.status(400).json({ error: e2.message });

  member_ids.forEach(mid => io.to(`user:${mid}`).emit("added_to_group", { conversation_id: convo.id, group_name: name }));
  res.json({ conversation_id: convo.id, ...convo });
});

app.get("/api/groups/:id", auth, async (req, res) => {
  const { data: convo, error } = await supabase.from("conversations")
    .select("*").eq("id", req.params.id).eq("is_group", true).single();
  if (error) return res.status(404).json({ error: "Group not found" });
  const { data: members } = await supabase.from("conversation_participants")
    .select("user:user_id(id, username, display_name, avatar_url), role").eq("conversation_id", req.params.id);
  res.json({ ...convo, members: members || [] });
});

app.patch("/api/groups/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { name, avatar_url } = req.body;
  const { data: me } = await supabase.from("conversation_participants")
    .select("role").eq("conversation_id", id).eq("user_id", req.user.id).maybeSingle();
  if (me?.role !== "admin") return res.status(403).json({ error: "Admins only" });
  const { data, error } = await supabase.from("conversations")
    .update({ group_name: name, group_avatar: avatar_url }).eq("id", id).select().single();
  if (error) return res.status(400).json({ error: error.message });
  io.to(`conv:${id}`).emit("group_updated", data);
  res.json(data);
});

app.post("/api/groups/:id/members", auth, async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  const { data: me } = await supabase.from("conversation_participants")
    .select("role").eq("conversation_id", id).eq("user_id", req.user.id).maybeSingle();
  if (me?.role !== "admin") return res.status(403).json({ error: "Admins only" });
  const { error } = await supabase.from("conversation_participants")
    .insert({ conversation_id: id, user_id, role: "member" });
  if (error) return res.status(400).json({ error: error.message });
  const { data: newMember } = await supabase.from("profiles")
    .select("id, username, display_name, avatar_url").eq("id", user_id).single();
  io.to(`conv:${id}`).emit("member_added", { conversation_id: id, user: newMember });
  io.to(`user:${user_id}`).emit("added_to_group", { conversation_id: id });
  res.json({ success: true, user: newMember });
});

app.delete("/api/groups/:id/members/:userId", auth, async (req, res) => {
  const { id, userId } = req.params;
  const { data: me } = await supabase.from("conversation_participants")
    .select("role").eq("conversation_id", id).eq("user_id", req.user.id).maybeSingle();
  if (userId !== req.user.id && me?.role !== "admin") return res.status(403).json({ error: "Not authorized" });

  // Check if the leaving user is an admin before removing
  const { data: leavingMember } = await supabase.from("conversation_participants")
    .select("role").eq("conversation_id", id).eq("user_id", userId).maybeSingle();

  const { error } = await supabase.from("conversation_participants")
    .delete().eq("conversation_id", id).eq("user_id", userId);
  if (error) return res.status(400).json({ error: error.message });

  let newAdminId = null;

  // If the leaving user was an admin, ensure at least one admin remains
  if (leavingMember?.role === "admin") {
    const { data: remaining } = await supabase.from("conversation_participants")
      .select("user_id, role").eq("conversation_id", id);

    if (remaining && remaining.length > 0) {
      const otherAdmins = remaining.filter(m => m.role === "admin");
      if (otherAdmins.length === 0) {
        // No admins left — randomly promote one remaining member
        const randomMember = remaining[Math.floor(Math.random() * remaining.length)];
        await supabase.from("conversation_participants")
          .update({ role: "admin" })
          .eq("conversation_id", id)
          .eq("user_id", randomMember.user_id);
        newAdminId = randomMember.user_id;
      }
    }
  }

  io.to(`conv:${id}`).emit("member_removed", { conversation_id: id, user_id: userId });
  if (newAdminId) {
    io.to(`conv:${id}`).emit("admin_transferred", {
      conversation_id: id,
      new_admin_id: newAdminId,
      reason: "random",
    });
  }
  res.json({ success: true, new_admin_id: newAdminId });
});

// Grant admin privilege to a member (admin only) — multiple admins supported
app.patch("/api/groups/:id/members/:userId/grant-admin", auth, async (req, res) => {
  const { id, userId } = req.params;
  const { data: me } = await supabase.from("conversation_participants")
    .select("role").eq("conversation_id", id).eq("user_id", req.user.id).maybeSingle();
  if (me?.role !== "admin") return res.status(403).json({ error: "Admins only" });

  const { data: target } = await supabase.from("conversation_participants")
    .select("role").eq("conversation_id", id).eq("user_id", userId).maybeSingle();
  if (!target) return res.status(404).json({ error: "Member not found" });
  if (target.role === "admin") return res.status(400).json({ error: "Already an admin" });

  const { error } = await supabase.from("conversation_participants")
    .update({ role: "admin" }).eq("conversation_id", id).eq("user_id", userId);
  if (error) return res.status(400).json({ error: error.message });

  io.to(`conv:${id}`).emit("admin_transferred", {
    conversation_id: id,
    new_admin_id: userId,
    granted_by: req.user.id,
    reason: "granted",
  });
  res.json({ success: true });
});

// Revoke admin privilege from a member (admin only)
app.patch("/api/groups/:id/members/:userId/revoke-admin", auth, async (req, res) => {
  const { id, userId } = req.params;
  if (userId === req.user.id) return res.status(400).json({ error: "Cannot revoke your own admin role" });
  const { data: me } = await supabase.from("conversation_participants")
    .select("role").eq("conversation_id", id).eq("user_id", req.user.id).maybeSingle();
  if (me?.role !== "admin") return res.status(403).json({ error: "Admins only" });

  const { error } = await supabase.from("conversation_participants")
    .update({ role: "member" }).eq("conversation_id", id).eq("user_id", userId);
  if (error) return res.status(400).json({ error: error.message });

  io.to(`conv:${id}`).emit("admin_revoked", {
    conversation_id: id,
    user_id: userId,
    revoked_by: req.user.id,
  });
  res.json({ success: true });
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
const onlineUsers = new Map();
const userVibes = new Map(); // userId -> vibeId

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("No token"));

  const cached = tokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    socket.userId = cached.user.id;
    return next();
  }

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return next(new Error("Invalid token"));

  tokenCache.set(token, { user, expiresAt: Date.now() + CACHE_TTL });
  socket.userId = user.id;
  next();
});

io.on("connection", (socket) => {
  onlineUsers.set(socket.userId, socket.id);
  socket.join(`user:${socket.userId}`);
  io.emit("user_online", socket.userId);

  socket.on("join_conversations", (ids) => {
    if (Array.isArray(ids)) ids.forEach(id => socket.join(`conv:${id}`));
  });

  socket.on("send_message", async ({ conversation_id, content }) => {
    if (!content?.trim()) return;
    const { data: me } = await supabase.from("conversation_participants")
      .select("conversation_id").eq("conversation_id", conversation_id)
      .eq("user_id", socket.userId).maybeSingle();
    if (!me) return;

    // Block messaging in DMs if users are unfriended
    const { data: convo } = await supabase.from("conversations")
      .select("is_group").eq("id", conversation_id).maybeSingle();
    if (convo && !convo.is_group) {
      const { data: parts } = await supabase.from("conversation_participants")
        .select("user_id").eq("conversation_id", conversation_id);
      const otherUserId = (parts || []).find(p => p.user_id !== socket.userId)?.user_id;
      if (otherUserId) {
        const { data: fr } = await supabase.from("friend_requests")
          .select("status")
          .or(`and(sender_id.eq.${socket.userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${socket.userId})`)
          .maybeSingle();
        if (!fr || fr.status !== "accepted") {
          return socket.emit("message_error", { error: "You can only message users you are friends with.", code: "NOT_FRIENDS" });
        }
      }
    }

    const { data: msg, error } = await supabase.from("messages")
      .insert({ conversation_id, sender_id: socket.userId, content: content.trim() })
      .select(`id, content, created_at, sender:sender_id(id, username, display_name, avatar_url)`).single();
    if (error) return socket.emit("message_error", { error: error.message });
    io.to(`conv:${conversation_id}`).emit("new_message", { ...msg, conversation_id });
  });

  // 1. Send the newly connected user ALL currently active vibes
  socket.emit("all_vibes", Object.fromEntries(userVibes));

  // 2. Re-broadcast this user's stored vibe to everyone else
  const storedVibe = userVibes.get(socket.userId);
  if (storedVibe && storedVibe !== "none") {
    io.emit("vibe_changed", { user_id: socket.userId, vibe_id: storedVibe });
  }

  socket.on("set_vibe", ({ vibe_id }) => {
    userVibes.set(socket.userId, vibe_id || "none");
    // Broadcast to all connected users (friends will filter on client)
    io.emit("vibe_changed", { user_id: socket.userId, vibe_id: vibe_id || "none" });
  });

  socket.on("typing_start", ({ conversation_id }) => {
    socket.to(`conv:${conversation_id}`).emit("user_typing", { user_id: socket.userId, conversation_id });
  });

  socket.on("typing_stop", ({ conversation_id }) => {
    socket.to(`conv:${conversation_id}`).emit("user_stopped_typing", { user_id: socket.userId, conversation_id });
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.userId);
    io.emit("user_offline", socket.userId);
    // On disconnect: keep vibe in map so it survives a page refresh/reconnect.
    // Only clear the online status — vibe is re-broadcast when they reconnect.
    // If they truly want to clear their vibe they can set it to "none" explicitly.
  });
});

app.get("/api/users/online", auth, (req, res) => res.json([...onlineUsers.keys()]));
app.get("/api/users/vibes", auth, (req, res) => res.json(Object.fromEntries(userVibes)));

// ─── Global Error Guards (prevents server crash on unhandled rejections) ──────
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`🚀 ChatWave on port ${PORT}`));