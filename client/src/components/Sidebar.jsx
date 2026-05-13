import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { api } from "../lib/api";
import Avatar from "./Avatar";
import CreateGroupModal from "./CreateGroupModal";
import { formatDistanceToNow } from "date-fns";
import { VibeBadge, VibePicker, getVibe } from "./VibeStatus";

export default function Sidebar({ conversations, setConversations, pendingCount, setPendingCount }) {
  const { user, signOut } = useAuth();
  const { onlineUsers, on, joinConversations, vibeStatuses, setVibe } = useSocket();
  const navigate = useNavigate();
  const { conversationId } = useParams();

  const [tab, setTab] = useState("chats");
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [openingChat, setOpeningChat] = useState(null);
  const [unfriendConfirm, setUnfriendConfirm] = useState(null); // requestId to confirm
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showVibePicker, setShowVibePicker] = useState(false);
  const [myVibeId, setMyVibeId] = useState("none");

  useEffect(() => {
    loadProfile();
    loadConversations();
    loadFriends();
    loadPendingRequests();
    // Load my stored vibe
    const savedVibe = localStorage.getItem("my_vibe_id") || "none";
    setMyVibeId(savedVibe);
    // Will be set once socket connects via setVibe
  
  }, []);

  useEffect(() => {
    if (!on) return;
    const off = on("new_message", (msg) => {
      setConversations(prev =>
        prev.map(c => c.id === msg.conversation_id
          ? { ...c, last_message: { content: msg.content, created_at: msg.created_at, sender_id: msg.sender?.id } }
          : c
        ).sort((a, b) => {
          if (!a.last_message) return 1;
          if (!b.last_message) return -1;
          return new Date(b.last_message.created_at) - new Date(a.last_message.created_at);
        })
      );
    });
    return off;
  }, [on]);

  useEffect(() => {
    if (!on) return;
    const off = on("friend_request", () => loadPendingRequests());
    return off;
  }, [on]);

  useEffect(() => {
    if (!on) return;
    const off = on("friend_request_cancelled", (data) => {
      setPendingRequests(prev => prev.filter(r => r.id !== data.request_id));
      setPendingCount(prev => Math.max(0, prev - 1));
    });
    return off;
  }, [on]);

  useEffect(() => {
    if (!on) return;
    const off = on("added_to_group", () => loadConversations());
    return off;
  }, [on]);

  useEffect(() => {
    if (!on) return;
    const off = on("friend_unfriended", () => loadFriends());
    return off;
  }, [on]);

  useEffect(() => {
    if (!on) return;
    // When the other user accepts our re-sent request, reload friends list
    const off = on("friend_accepted", (data) => {
      loadFriends();
      // Update search results in real-time: if the accepted user is in results, mark as friends
      setSearchResults(prev => prev.map(u =>
        (u.id === data?.sender?.id || u.id === data?.receiver?.id)
          ? { ...u, friendStatus: "friends", requestId: data?.id }
          : u
      ));
    });
    return off;
  }, [on]);

  // Real-time: our sent request was declined — reset search result button to Add
  useEffect(() => {
    if (!on) return;
    const off = on("friend_declined", (data) => {
      setSearchResults(prev => prev.map(u =>
        u.requestId === data?.request_id
          ? { ...u, friendStatus: "none", requestId: null }
          : u
      ));
    });
    return off;
  }, [on]);

  useEffect(() => {
    if (!on) return;
    const off = on("new_conversation", () => loadConversations());
    return off;
  }, [on]);

  useEffect(() => {
    if (!on) return;
    // Refresh sidebar when admin privilege changes (role shown in DM/group list)
    const off1 = on("admin_transferred", () => loadConversations());
    const off2 = on("admin_revoked", () => loadConversations());
    return () => { off1(); off2(); };
  }, [on]);

  function handleSetVibe(vibeId) {
    setMyVibeId(vibeId);
    localStorage.setItem("my_vibe_id", vibeId);
    setVibe(vibeId);
  }

  async function loadProfile() {
    try { setProfile(await api.get("/api/profile/me")); } catch (e) { console.error(e); }
  }

  async function loadConversations() {
    try {
      const data = await api.get("/api/conversations");
      setConversations(data);
      joinConversations?.(data.map(c => c.id));
    } catch (e) { console.error(e); }
  }

  async function loadFriends() {
    try { setFriends(await api.get("/api/friends")); } catch (e) { console.error(e); }
  }

  async function loadPendingRequests() {
    try {
      const data = await api.get("/api/friends/requests");
      setPendingRequests(data);
      setPendingCount(data.length);
    } catch (e) { console.error(e); }
  }

  async function handleSearch(q) {
    setSearchQuery(q);
    if (!q.trim()) return setSearchResults([]);
    setLoadingSearch(true);
    try { setSearchResults(await api.get(`/api/users/search?q=${encodeURIComponent(q)}`)); }
    catch (e) { console.error(e); }
    finally { setLoadingSearch(false); }
  }

  async function sendFriendRequest(userId) {
    try {
      const data = await api.post("/api/friends/request", { receiver_id: userId });
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, friendStatus: "pending_sent", requestId: data.id } : u));
    } catch (err) { alert(err.message); }
  }

  async function cancelFriendRequest(requestId, userId) {
    try {
      await api.patch(`/api/friends/request/${requestId}/cancel`, {});
      setSearchResults(prev => prev.map(u => u.id === userId ? { ...u, friendStatus: "none", requestId: null } : u));
    } catch (err) { alert(err.message); }
  }

  async function acceptRequest(requestId) {
    try {
      await api.patch(`/api/friends/request/${requestId}/accept`, {});
      await Promise.all([loadPendingRequests(), loadFriends()]);
    } catch (e) { console.error(e); }
  }

  async function declineRequest(requestId) {
    try {
      await api.patch(`/api/friends/request/${requestId}/decline`, {});
      await loadPendingRequests();
    } catch (e) { console.error(e); }
  }

  async function unfriend(requestId) {
    try {
      await api.patch(`/api/friends/${requestId}/unfriend`, {});
      setUnfriendConfirm(null);
      await loadFriends();
    } catch (e) { console.error(e); alert(e.message); }
  }

  async function openChat(friendId) {
    if (openingChat === friendId) return;
    setOpeningChat(friendId);
    try {
      const result = await api.post("/api/conversations", { friend_id: friendId });
      const convId = result.conversation_id;
      if (!convId) throw new Error("No conversation_id returned");
      await loadConversations();
      setTab("chats");
      navigate(`/chat/${convId}`);
    } catch (e) {
      console.error("openChat failed:", e);
      alert("Could not open chat: " + e.message);
    } finally {
      setOpeningChat(null);
    }
  }

  async function handleGroupCreated(convId) {
    setShowCreateGroup(false);
    await loadConversations();
    setTab("chats");
    navigate(`/chat/${convId}`, { state: { newGroup: true } });
  }

  // Group avatar: stack first 2 member initials
  function GroupAvatar({ members = [], name = "" }) {
    const colors = ["#7c5cfc", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
    const getColor = (str) => colors[(str?.charCodeAt(0) || 0) % colors.length];
    const initials = (str) => (str || "?")[0].toUpperCase();
    if (members.length === 0) {
      return (
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#7c5cfc,#a584ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👥</div>
      );
    }
    return (
      <div style={{ width: 40, height: 40, position: "relative", flexShrink: 0 }}>
        {members.slice(0, 2).map((m, i) => (
          <div key={m.id} style={{
            position: "absolute",
            width: 26, height: 26, borderRadius: "50%",
            background: getColor(m.display_name || m.username),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "white",
            border: "2px solid #13131a",
            top: i === 0 ? 0 : "auto", bottom: i === 1 ? 0 : "auto",
            left: i === 0 ? 0 : "auto", right: i === 1 ? 0 : "auto",
          }}>
            {initials(m.display_name || m.username)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "288px", flexShrink: 0, background: "#13131a", borderRight: "1px solid #2a2a3a" }}>

        {/* Header */}
        <div style={{ padding: "16px", borderBottom: "1px solid #2a2a3a", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 28, height: 28, background: "#7c5cfc", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <span style={{ fontWeight: 700, color: "#e8e8f0", fontSize: 15 }}>ChatWave</span>
            </div>
            <button onClick={signOut} title="Sign out" style={{ background: "none", border: "none", cursor: "pointer", color: "#6b6b7f", padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
          {profile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => navigate(`/profile/${user?.id}`)}
                style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, background: "none", border: "none", cursor: "pointer", borderRadius: 10, padding: "6px 8px", minWidth: 0 }}
                onMouseEnter={e => e.currentTarget.style.background = "#1a1a24"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <Avatar user={profile} size="sm" online />
                <div style={{ textAlign: "left", minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.display_name || profile.username}</div>
                  <div style={{ marginTop: 2 }}>
                    {myVibeId && myVibeId !== "none"
                      ? <VibeBadge vibeId={myVibeId} size="xs" />
                      : <span style={{ fontSize: 11, color: "#9898a8" }}>@{profile.username}</span>
                    }
                  </div>
                </div>
              </button>
              {/* Set Vibe button */}
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => setShowVibePicker(v => !v)}
                  title="Set your vibe"
                  style={{
                    background: showVibePicker ? "#7c5cfc22" : "none",
                    border: `1px solid ${showVibePicker ? "#7c5cfc55" : "#2a2a3a"}`,
                    borderRadius: 8, padding: "5px 8px", cursor: "pointer",
                    fontSize: 11, fontWeight: 600,
                    color: showVibePicker ? "#a584ff" : "#9898a8",
                    display: "flex", alignItems: "center", gap: 4,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!showVibePicker) { e.currentTarget.style.background = "#1a1a24"; e.currentTarget.style.color = "#e8e8f0"; } }}
                  onMouseLeave={e => { if (!showVibePicker) { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#9898a8"; } }}
                >
                  <span style={{ fontSize: 14 }}>{getVibe(myVibeId).emoji}</span>
                  <span>Vibe</span>
                </button>
                {showVibePicker && (
                  <VibePicker
                    currentVibeId={myVibeId}
                    onSelect={handleSetVibe}
                    onClose={() => setShowVibePicker(false)}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #2a2a3a", flexShrink: 0 }}>
          {[{ id: "chats", label: "Chats" }, { id: "friends", label: "Friends" }, { id: "add", label: "Add" }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: "11px 4px", background: "none", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, color: tab === t.id ? "#7c5cfc" : "#9898a8",
                borderBottom: tab === t.id ? "2px solid #7c5cfc" : "2px solid transparent",
                transition: "color 0.15s",
              }}
            >
              {t.label}
              {t.id === "friends" && pendingCount > 0 && (
                <span style={{ marginLeft: 4, background: "#7c5cfc", color: "white", borderRadius: 99, fontSize: 10, padding: "1px 5px" }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* CHATS TAB */}
          {tab === "chats" && (
            <div>
              {/* New Group button */}
              <div style={{ padding: "10px 12px 6px" }}>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    background: "#7c5cfc15", border: "1px dashed #7c5cfc55", borderRadius: 10,
                    padding: "8px 0", color: "#a584ff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#7c5cfc25"}
                  onMouseLeave={e => e.currentTarget.style.background = "#7c5cfc15"}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  New Group Chat
                </button>
              </div>

              {conversations.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9898a8", fontSize: 13, padding: "30px 16px" }}>
                  No conversations yet.<br />Add friends or create a group!
                </div>
              ) : conversations.map(conv => {
                const isGroup = conv.is_group;
                const name = isGroup ? conv.group_name : (conv.other_user?.display_name || conv.other_user?.username || "Unknown");
                const isActive = conversationId === conv.id;
                const isOnline = !isGroup && conv.other_user && onlineUsers?.has(conv.other_user.id);

                return (
                  <button key={conv.id} onClick={() => navigate(`/chat/${conv.id}`)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px", background: isActive ? "#1a1a24" : "none",
                      border: "none", borderLeft: isActive ? "2px solid #7c5cfc" : "2px solid transparent",
                      cursor: "pointer", textAlign: "left",
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#16161f"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "none"; }}
                  >
                    {isGroup
                      ? <GroupAvatar members={conv.members || []} name={conv.group_name} />
                      : <Avatar user={conv.other_user} size="md" online={isOnline} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                          {isGroup && <span style={{ fontSize: 10, background: "#7c5cfc22", color: "#a584ff", borderRadius: 4, padding: "1px 4px", fontWeight: 700, flexShrink: 0 }}>GROUP</span>}
                          {name}
                        </span>
                        {conv.last_message && (
                          <span style={{ fontSize: 10, color: "#6b6b7f", flexShrink: 0, marginLeft: 4 }}>
                            {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: false })}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "#9898a8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
                        {!isGroup && conv.other_user && vibeStatuses?.get(conv.other_user.id) && vibeStatuses.get(conv.other_user.id) !== "none" && (
                          <VibeBadge vibeId={vibeStatuses.get(conv.other_user.id)} size="xs" />
                        )}
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {conv.last_message
                            ? (conv.last_message.sender_id === user?.id ? "You: " : "") + conv.last_message.content
                            : isGroup ? `${conv.members?.length || 0} members` : "Start the conversation!"}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* FRIENDS TAB */}
          {tab === "friends" && (
            <div style={{ padding: "12px 16px" }}>
              {pendingRequests.length > 0 && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#6b6b7f", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Pending Requests</div>
                  {pendingRequests.map(req => (
                    <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <Avatar user={req.sender} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0" }}>{req.sender.display_name || req.sender.username}</div>
                        <div style={{ fontSize: 11, color: "#9898a8" }}>@{req.sender.username}</div>
                      </div>
                      <button onClick={() => acceptRequest(req.id)}
                        style={{ width: 28, height: 28, background: "#7c5cfc", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      <button onClick={() => declineRequest(req.id)}
                        style={{ width: 28, height: 28, background: "#2a2a3a", border: "none", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9898a8" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                  <div style={{ height: 1, background: "#2a2a3a", margin: "12px 0" }} />
                </>
              )}
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6b6b7f", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Friends ({friends.length})</div>
              {friends.length === 0 ? (
                <div style={{ color: "#9898a8", fontSize: 13 }}>No friends yet. Use the Add tab!</div>
              ) : friends.map(({ requestId, friend }) => (
                <div key={requestId} style={{ marginBottom: 4 }}>
                  {unfriendConfirm === requestId ? (
                    <div style={{ background: "#1a1a24", border: "1px solid #ef444433", borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 12, color: "#e8e8f0", marginBottom: 8 }}>
                        Unfriend <strong>{friend.display_name || friend.username}</strong>? The conversation will remain, but you won't be able to message each other.
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => unfriend(requestId)}
                          style={{ flex: 1, background: "#ef4444", border: "none", borderRadius: 7, padding: "6px 0", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Yes, Unfriend
                        </button>
                        <button onClick={() => setUnfriendConfirm(null)}
                          style={{ flex: 1, background: "#2a2a3a", border: "none", borderRadius: 7, padding: "6px 0", color: "#9898a8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 10, padding: "6px 8px" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#1a1a24"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}
                    >
                      <button onClick={() => openChat(friend.id)}
                        disabled={openingChat === friend.id}
                        style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: openingChat === friend.id ? "wait" : "pointer", minWidth: 0 }}
                      >
                        <Avatar user={friend} size="sm" online={onlineUsers?.has(friend.id)} />
                        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0" }}>{friend.display_name || friend.username}</div>
                          <div style={{ fontSize: 11, marginTop: 2 }}>
                            {vibeStatuses?.get(friend.id) && vibeStatuses.get(friend.id) !== "none"
                              ? <VibeBadge vibeId={vibeStatuses.get(friend.id)} size="xs" />
                              : <span style={{ color: onlineUsers?.has(friend.id) ? "#4ade80" : "#9898a8" }}>
                                  {onlineUsers?.has(friend.id) ? "● Online" : `@${friend.username}`}
                                </span>
                            }
                          </div>
                        </div>
                        {openingChat === friend.id
                          ? <div style={{ width: 16, height: 16, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                          : <div style={{ fontSize: 11, color: "#7c5cfc", background: "#7c5cfc22", borderRadius: 6, padding: "3px 8px" }}>Chat</div>
                        }
                      </button>
                      {/* Unfriend button */}
                      <button
                        onClick={() => setUnfriendConfirm(requestId)}
                        title="Unfriend"
                        style={{ flexShrink: 0, width: 28, height: 28, background: "none", border: "1px solid #2a2a3a", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b6b7f", transition: "all 0.15s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#ef444422"; e.currentTarget.style.borderColor = "#ef444455"; e.currentTarget.style.color = "#ef4444"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.borderColor = "#2a2a3a"; e.currentTarget.style.color = "#6b6b7f"; }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="8.5" cy="7" r="4"/>
                          <line x1="18" y1="8" x2="23" y2="13"/>
                          <line x1="23" y1="8" x2="18" y2="13"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ADD TAB */}
          {tab === "add" && (
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6b6b7f", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Find People</div>
              <input type="text" value={searchQuery} onChange={e => handleSearch(e.target.value)}
                placeholder="Search by username..."
                style={{ width: "100%", boxSizing: "border-box", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 10, padding: "9px 14px", color: "#e8e8f0", fontSize: 13, fontFamily: "inherit", outline: "none", marginBottom: 10 }}
                onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                onBlur={e => e.target.style.borderColor = "#2a2a3a"}
              />
              {loadingSearch && (
                <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
                  <div style={{ width: 18, height: 18, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                </div>
              )}
              {searchResults.map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <Avatar user={u} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0" }}>{u.display_name || u.username}</div>
                    <div style={{ fontSize: 11, color: "#9898a8" }}>@{u.username}</div>
                  </div>
                  {u.friendStatus === "pending_sent" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 11, color: "#9898a8", fontWeight: 600 }}>Pending</span>
                      <button onClick={() => cancelFriendRequest(u.requestId, u.id)}
                        style={{ fontSize: 11, background: "#ff4d4d22", color: "#ff4d4d", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>
                        Cancel
                      </button>
                    </div>
                  ) : u.friendStatus === "friends" ? (
                    <span style={{ fontSize: 11, color: "#4caf50", fontWeight: 600 }}>Friends</span>
                  ) : (
                    <button onClick={() => sendFriendRequest(u.id)}
                      style={{ fontSize: 11, background: "#7c5cfc22", color: "#7c5cfc", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}>
                      + Add
                    </button>
                  )}
                </div>
              ))}
              {searchQuery && !loadingSearch && searchResults.length === 0 && (
                <div style={{ color: "#9898a8", fontSize: 13, textAlign: "center", paddingTop: 8 }}>No users found</div>
              )}
            </div>
          )}
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={handleGroupCreated}
        />
      )}
    </>
  );
}
