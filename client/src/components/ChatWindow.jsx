import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { api } from "../lib/api";
import Avatar from "./Avatar";
import GroupInfoPanel from "./GroupInfoPanel";
import { VibeBadge } from "./VibeStatus";
import { format, isToday, isYesterday } from "date-fns";

function formatMsgTime(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

function formatDateDivider(dateStr) {
  const d = new Date(dateStr);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMMM d, yyyy");
}

const EMOJI_CATEGORIES = [
  { label: "😊", name: "Smileys", emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🫢","🫣","🤫","🤔","🫠","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"] },
  { label: "👋", name: "People", emojis: ["👋","🤚","🖐️","✋","🖖","👌","✌️","🤞","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤝","🙏","💅","💪","🦾","🦵","🦶","👂","👃","👀","👅","👄","👶","🧒","👦","👧","🧑","👱","👨","🧔","👩","🧓","👴","👵","🙍","🙎","🙅","🙆","💁","🙋","🙇","🤦","🤷","👮","🕵️","💂","🥷","👷","🫅","🤴","👸","👳","👲","🧕","🤵","👰","🤰","🫄","🤱","👼","🎅","🤶","🧙","🧝","🧛","🧟","🧞","🧜","🧚","🧌","👫","👬","👭","💏","💑","👨‍👩‍👦","👨‍👩‍👧"] },
  { label: "🐶", name: "Animals", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🕷️","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🦫","🦦","🦥","🐕","🐩","🐈","🐓","🦃","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🐁","🐀","🐿️","🦔"] },
  { label: "🍕", name: "Food", emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🥦","🥬","🥒","🌶️","🧄","🧅","🥔","🌽","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🥪","🥙","🧆","🌮","🌯","🥗","🥘","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥮","🍢","🧁","🍡","🍧","🍨","🍦","🥧","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🧋","☕","🍵","🫖","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾"] },
  { label: "⚽", name: "Activity", emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🪀","🏓","🏸","🏒","🏑","🥍","🏏","🥅","⛳","🎯","🎣","🤿","🎽","🥊","🥋","🏆","🥇","🥈","🥉","🏅","🎖️","🎗️","🎫","🎟️","🎪","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🪘","🎷","🎺","🪗","🎸","🪕","🎻","🎲","♟️","🎯","🎳","🎮","🎰","🧩","🎪","🎠","🎡","🎢","🎭","🎨"] },
  { label: "🚀", name: "Travel", emojis: ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🛴","🚲","🛵","🏍️","✈️","🛫","🛬","🛩️","💺","🛰️","🚀","🛸","🚁","⛵","🚤","🛥️","🛳️","🚢","⚓","🗺️","🗽","🗼","🏰","🏯","🏟️","🗻","🏔️","⛰️","🌋","🏕️","🏖️","🏜️","🏝️","🏞️","🏠","🏡","🏢","🏣","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","⛪","🕌","🕍","⛩️","🕋","⛲","🎠","🎡","🎢","💈","🎪"] },
  { label: "💡", name: "Objects", emojis: ["⌚","📱","💻","⌨️","🖥️","🖨️","🖱️","🕹️","💾","💿","📀","📷","📸","📹","🎥","📞","☎️","📺","📻","🧭","⏱️","⏰","📡","🔋","🔌","💡","🔦","🕯️","💰","💳","💹","📊","📋","📌","📍","🗂️","🔒","🔓","🔑","🗝️","🔨","🪓","🔧","🔩","⚙️","🧲","🔫","💣","🧨","🔪","🛡️","🧴","🧷","🧹","🧺","🧻","🧼","🛒","💊","🩺","🩻","🧬","🔬","🔭","📡","🛸","🪄","🎁","🎀","🎊","🎉","🎈","🪅","🎆","🎇","✨","🎃","🎄","🎋","🎍","🎎","🎐","🎑","🧧","🎏"] },
  { label: "❤️", name: "Symbols", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","❤️‍🩹","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","☢️","☣️","❌","⭕","🛑","⛔","📛","🚫","💯","💢","♨️","🔔","🔕","🎵","🎶","✅","❎","🔱","⚜️","🏁","🚩","🎌","🏴","🏳️","🏳️‍🌈","🏳️‍⚧️","🏴‍☠️","🌈","⭐","🌟","💫","✨","🌙","☀️","⛅","🌤️","🌈","❄️","⛄","🔥","💧","🌊","🌀","🌪️","🌫️","🌬️","🌙","☁️","⛈️","🌩️","🌨️","🌧️","🌦️","🌥️","☀️","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔"] },
];

function EmojiPicker({ onSelect }) {
  const [activeTab, setActiveTab] = useState(0);
  const cat = EMOJI_CATEGORIES[activeTab];
  return (
    <>
      <div style={{ display: "flex", borderBottom: "1px solid #2a2a3a", padding: "4px 6px 0", gap: 2, flexShrink: 0 }}>
        {EMOJI_CATEGORIES.map((c, i) => (
          <button key={i} onClick={() => setActiveTab(i)} title={c.name}
            style={{
              flex: 1, background: activeTab === i ? "#7c5cfc22" : "none",
              border: "none", borderRadius: "6px 6px 0 0",
              borderBottom: activeTab === i ? "2px solid #7c5cfc" : "2px solid transparent",
              padding: "5px 2px", cursor: "pointer", fontSize: 14, lineHeight: 1,
            }}>
            {c.label}
          </button>
        ))}
      </div>
      <div style={{ overflowY: "auto", padding: "6px 8px", display: "flex", flexWrap: "wrap", gap: 2 }}>
        {cat.emojis.map((emoji, i) => (
          <button key={i} onClick={() => onSelect(emoji)}
            style={{
              width: 34, height: 34, background: "none", border: "none",
              borderRadius: 8, cursor: "pointer", fontSize: 18, lineHeight: 1,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#7c5cfc22"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}

// Stacked group avatar for the header
function GroupAvatarHeader({ members = [] }) {
  const colors = ["#7c5cfc","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899"];
  const getColor = str => colors[(str?.charCodeAt(0)||0) % colors.length];
  const shown = members.slice(0, 3);
  if (shown.length === 0) return (
    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#7c5cfc,#a584ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👥</div>
  );
  return (
    <div style={{ position: "relative", width: 40, height: 40, flexShrink: 0 }}>
      {shown.map((m, i) => (
        <div key={m.id} style={{
          position: "absolute", width: 22, height: 22, borderRadius: "50%",
          background: getColor(m.display_name || m.username),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, color: "white",
          border: "2px solid #13131a",
          top: i === 0 ? 0 : i === 1 ? "auto" : 4,
          bottom: i === 1 ? 0 : "auto",
          left: i === 0 ? 0 : i === 2 ? 4 : "auto",
          right: i === 1 ? 0 : "auto",
          zIndex: 3 - i,
        }}>
          {(m.display_name || m.username || "?")[0].toUpperCase()}
        </div>
      ))}
    </div>
  );
}

export default function ChatWindow({ conversationId }) {
  const { user } = useAuth();
  const { socketRef, connected, sendMessage: socketSend, startTyping, stopTyping, onlineUsers, joinConversations, vibeStatuses } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [convInfo, setConvInfo] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null); // null | "accepted" | "unfriended"

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const convIdRef = useRef(conversationId);
  convIdRef.current = conversationId;

  useEffect(() => {
    if (!conversationId) return;
    setMessages([]);
    setInput("");
    setConvInfo(null);
    setTypingUsers(new Set());
    // Auto-open group info panel if this is a newly created group
    const isNewGroup = location.state?.newGroup === true;
    setShowGroupInfo(isNewGroup);
    setLoading(true);
    setFriendStatus(null);
    joinConversations?.([conversationId]);
    loadMessages();
    loadConvInfo();
  }, [conversationId]);

  // Socket listeners
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket || !conversationId) return;
    socket.emit("join_conversations", [conversationId]);

    function onNewMessage(msg) {
      if (msg.conversation_id !== convIdRef.current) return;
      setMessages(prev => {
        const idx = prev.findIndex(m => m._optimistic && m._tempId === msg._tempId);
        if (idx !== -1) { const n = [...prev]; n[idx] = msg; return n; }
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      setTypingUsers(prev => { const s = new Set(prev); s.delete(msg.sender?.id); return s; });
    }

    function onUserTyping({ user_id, conversation_id }) {
      if (conversation_id !== convIdRef.current || user_id === user?.id) return;
      setTypingUsers(prev => new Set([...prev, user_id]));
    }

    function onUserStoppedTyping({ user_id, conversation_id }) {
      if (conversation_id !== convIdRef.current) return;
      setTypingUsers(prev => { const s = new Set(prev); s.delete(user_id); return s; });
    }

    function onMemberAdded({ conversation_id }) {
      if (conversation_id === convIdRef.current) loadConvInfo();
    }

    function onMemberRemoved({ conversation_id }) {
      if (conversation_id === convIdRef.current) loadConvInfo();
    }

    function onGroupUpdated() { loadConvInfo(); }
    function onAdminTransferred() { loadConvInfo(); }
    function onAdminRevoked() { loadConvInfo(); }

    socket.on("new_message", onNewMessage);
    socket.on("user_typing", onUserTyping);
    socket.on("user_stopped_typing", onUserStoppedTyping);
    socket.on("member_added", onMemberAdded);
    socket.on("member_removed", onMemberRemoved);
    socket.on("group_updated", onGroupUpdated);
    socket.on("admin_transferred", onAdminTransferred);
    socket.on("admin_revoked", onAdminRevoked);

    function onFriendUnfriended() {
      setFriendStatus("unfriended");
    }
    socket.on("friend_unfriended", onFriendUnfriended);

    function onFriendDeclined() {
      setFriendStatus("declined");
    }
    socket.on("friend_declined", onFriendDeclined);

    function onFriendAccepted() {
      // Re-check status in case this acceptance is for the current DM conversation
      if (convInfo && !convInfo.is_group && convInfo.other_user) {
        setFriendStatus("accepted");
      }
    }
    socket.on("friend_accepted", onFriendAccepted);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("user_typing", onUserTyping);
      socket.off("user_stopped_typing", onUserStoppedTyping);
      socket.off("member_added", onMemberAdded);
      socket.off("member_removed", onMemberRemoved);
      socket.off("group_updated", onGroupUpdated);
      socket.off("admin_transferred", onAdminTransferred);
      socket.off("admin_revoked", onAdminRevoked);
      socket.off("friend_unfriended", onFriendUnfriended);
      socket.off("friend_declined", onFriendDeclined);
      socket.off("friend_accepted", onFriendAccepted);
    };
  }, [connected, conversationId, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  async function loadMessages() {
    try {
      const data = await api.get(`/api/conversations/${conversationId}/messages`);
      setMessages(Array.isArray(data) ? data : []);
    } catch (e) { console.error("loadMessages:", e.message); }
    finally { setLoading(false); }
  }

  async function loadConvInfo() {
    try {
      const data = await api.get(`/api/conversations/${conversationId}`);
      setConvInfo(data);
    } catch (e) { console.error("loadConvInfo:", e.message); }
  }

  // Load DM friend status whenever convInfo updates
  useEffect(() => {
    if (!convInfo || convInfo.is_group || !convInfo.other_user) return;
    api.get(`/api/friends/status/${convInfo.other_user.id}`)
      .then(d => setFriendStatus(d.status))
      .catch(() => {});
  }, [convInfo]);

  function handleSend() {
    const text = input.trim();
    if (!text || !conversationId) return;
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      id: tempId, _optimistic: true, _tempId: tempId,
      conversation_id: conversationId, content: text,
      created_at: new Date().toISOString(),
      sender: { id: user?.id, username: user?.email?.split("@")[0] || "You", display_name: null },
    };
    setMessages(prev => [...prev, optimistic]);
    setInput("");
    setShowEmojiPicker(false);
    clearTimeout(typingTimeoutRef.current);
    stopTyping?.(conversationId);
    if (textareaRef.current) { textareaRef.current.style.height = "44px"; textareaRef.current.focus(); }
    socketSend?.(conversationId, text);
  }

  function insertEmoji(emoji) {
    const ta = textareaRef.current;
    if (!ta) { setInput(prev => prev + emoji); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newVal = input.slice(0, start) + emoji + input.slice(end);
    setInput(newVal);
    // Restore cursor after emoji
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
      ta.style.height = "44px";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    });
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  function handleInputChange(e) {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "44px";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    startTyping?.(conversationId);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping?.(conversationId), 1500);
  }

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    function handleOutside(e) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showEmojiPicker]);

  const isGroup = convInfo?.is_group || false;
  const otherUser = convInfo?.other_user || null;
  const chatName = isGroup ? convInfo?.group_name : (otherUser?.display_name || otherUser?.username);
  const isOnline = !isGroup && otherUser && onlineUsers?.has(otherUser.id);
  const members = convInfo?.members || [];

  // Map member id → profile for showing names in group
  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m; });

  // Find typing user display name
  const typingNames = [...typingUsers].map(uid => {
    const m = memberMap[uid];
    return m ? (m.display_name || m.username) : "Someone";
  });

  if (!conversationId) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0f" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 12, opacity: 0.1 }}>💬</div>
          <p style={{ color: "#9898a8", fontWeight: 500 }}>Select a conversation</p>
          <p style={{ color: "#6b6b7f", fontSize: 13, marginTop: 4 }}>or go to Friends and click Chat</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flex: 1, minWidth: 0, overflow: "hidden", height: "100%", position: "relative" }}>
      {/* Main chat column */}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, overflow: "hidden" }}>

        {/* Header */}
        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid #2a2a3a", background: "#13131a" }}>
          {convInfo ? (
            <button
              onClick={() => isGroup ? setShowGroupInfo(v => !v) : otherUser && navigate(`/profile/${otherUser.id}`)}
              style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: "none", cursor: "pointer", padding: 0, flex: 1, minWidth: 0 }}
            >
              {isGroup
                ? <GroupAvatarHeader members={members} />
                : <Avatar user={otherUser} size="md" online={isOnline} />
              }
              <div style={{ textAlign: "left", minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "#e8e8f0", fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                  {isGroup && <span style={{ fontSize: 9, background: "#7c5cfc33", color: "#a584ff", borderRadius: 4, padding: "2px 5px", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Group</span>}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{chatName || "Chat"}</span>
                </div>
                <div style={{ fontSize: 12, marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
                  {isGroup
                    ? <span style={{ color: "#9898a8" }}>{`${members.length} member${members.length !== 1 ? "s" : ""} · click to manage`}</span>
                    : (() => {
                        const friendVibeId = otherUser && vibeStatuses?.get(otherUser.id);
                        if (friendVibeId && friendVibeId !== "none") {
                          return <VibeBadge vibeId={friendVibeId} size="xs" />;
                        }
                        return <span style={{ color: isOnline ? "#4ade80" : "#9898a8" }}>{isOnline ? "● Online" : otherUser ? `@${otherUser.username}` : ""}</span>;
                      })()
                  }
                </div>
              </div>
            </button>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a1a24" }} />
              <div><div style={{ width: 100, height: 14, background: "#1a1a24", borderRadius: 4, marginBottom: 6 }} /><div style={{ width: 60, height: 10, background: "#1a1a24", borderRadius: 4 }} /></div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {/* Group info toggle button */}
            {isGroup && (
              <button
                onClick={() => setShowGroupInfo(v => !v)}
                title="Group members"
                style={{
                  background: showGroupInfo ? "#7c5cfc22" : "none", border: "none", cursor: "pointer",
                  color: showGroupInfo ? "#a584ff" : "#6b6b7f", borderRadius: 8, padding: 6,
                  transition: "all 0.15s",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </button>
            )}
            {/* Connection dot */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: connected ? "#4ade80" : "#f87171" }} />
            </div>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <div style={{ width: 24, height: 24, border: "2px solid #7c5cfc", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
            </div>
          ) : messages.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
              {isGroup ? (
                <div style={{ textAlign: "center" }}>
                  <GroupAvatarHeader members={members} />
                  <div style={{ marginTop: 14, fontWeight: 700, color: "#e8e8f0", fontSize: 18 }}>{convInfo?.group_name}</div>
                  <div style={{ fontSize: 13, color: "#9898a8", marginTop: 4 }}>{members.length} members</div>
                  <div style={{ fontSize: 13, color: "#6b6b7f", marginTop: 10 }}>Send the first message to the group! 🎉</div>
                </div>
              ) : otherUser && (
                <div style={{ textAlign: "center" }}>
                  <Avatar user={otherUser} size="2xl" />
                  <div style={{ marginTop: 14, fontWeight: 600, color: "#e8e8f0", fontSize: 17 }}>{otherUser.display_name || otherUser.username}</div>
                  <div style={{ fontSize: 13, color: "#9898a8" }}>@{otherUser.username}</div>
                  <div style={{ fontSize: 13, color: "#6b6b7f", marginTop: 10 }}>Say hello 👋 This is the start of your conversation.</div>
                </div>
              )}
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const prev = messages[i - 1];
                const senderId = msg.sender?.id ?? msg.sender_id;
                const isMine = senderId === user?.id;
                const prevSenderId = prev ? (prev.sender?.id ?? prev.sender_id) : null;
                const showAvatar = !isMine && senderId !== prevSenderId;
                const showDate = !prev || new Date(msg.created_at).toDateString() !== new Date(prev.created_at).toDateString();
                const isOptimistic = !!msg._optimistic;

                // In group, show sender name above bubble if it's the first in a run
                const senderProfile = memberMap[senderId] || msg.sender;
                const senderName = senderProfile?.display_name || senderProfile?.username || "Unknown";

                return (
                  <div key={msg.id}>
                    {showDate && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
                        <div style={{ flex: 1, height: 1, background: "#2a2a3a" }} />
                        <span style={{ fontSize: 11, color: "#6b6b7f", background: "#0a0a0f", padding: "0 8px" }}>{formatDateDivider(msg.created_at)}</span>
                        <div style={{ flex: 1, height: 1, background: "#2a2a3a" }} />
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 2, flexDirection: isMine ? "row-reverse" : "row" }}>
                      {!isMine && (
                        <div style={{ width: 32, flexShrink: 0, alignSelf: "flex-end" }}>
                          {showAvatar && <Avatar user={msg.sender || {}} size="sm" />}
                        </div>
                      )}
                      <div style={{ display: "flex", flexDirection: "column", maxWidth: "60%", alignItems: isMine ? "flex-end" : "flex-start" }}>
                        {/* Sender name in group chats */}
                        {!isMine && isGroup && showAvatar && (
                          <span style={{ fontSize: 11, color: "#a584ff", fontWeight: 600, marginBottom: 3, paddingLeft: 2 }}>
                            {senderName}
                          </span>
                        )}
                        {!isMine && !isGroup && showAvatar && (
                          <span style={{ fontSize: 11, color: "#9898a8", marginBottom: 3, paddingLeft: 2 }}>{senderName}</span>
                        )}
                        <div style={{
                          padding: "9px 14px", borderRadius: 16,
                          borderBottomRightRadius: isMine ? 4 : 16,
                          borderBottomLeftRadius: isMine ? 16 : 4,
                          background: isMine ? "#7c5cfc" : "#1a1a24",
                          border: isMine ? "none" : "1px solid #2a2a3a",
                          color: isMine ? "white" : "#e8e8f0",
                          fontSize: 14, lineHeight: 1.5, wordBreak: "break-word",
                          opacity: isOptimistic ? 0.7 : 1,
                          transition: "opacity 0.2s",
                        }}>
                          {msg.content}
                        </div>
                        <span style={{ fontSize: 10, color: "#6b6b7f", marginTop: 3, padding: "0 2px" }}>
                          {isOptimistic ? "Sending…" : formatMsgTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {typingUsers.size > 0 && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 8 }}>
                  <div style={{ width: 32 }}>
                    {!isGroup && otherUser && <Avatar user={otherUser} size="sm" />}
                    {isGroup && typingNames[0] && (
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#7c5cfc", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>
                        {typingNames[0][0]}
                      </div>
                    )}
                  </div>
                  <div style={{ background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 14, borderBottomLeftRadius: 4, padding: "8px 14px" }}>
                    {isGroup && typingNames.length > 0 && (
                      <div style={{ fontSize: 10, color: "#9898a8", marginBottom: 4 }}>
                        {typingNames.slice(0, 2).join(", ")}{typingNames.length > 2 ? " & others" : ""} typing…
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0, 150, 300].map(d => (
                        <span key={d} style={{ width: 7, height: 7, background: "#9898a8", borderRadius: "50%", display: "inline-block", animation: `bounce 1s ${d}ms infinite` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div style={{ flexShrink: 0, borderTop: "1px solid #2a2a3a", background: "#13131a", padding: "12px 16px" }}>
          {!convInfo?.is_group && friendStatus !== null && friendStatus !== "accepted" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, padding: "12px 16px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b6b7f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
              </svg>
              <span style={{ color: "#6b6b7f", fontSize: 13 }}>
                {friendStatus === "unfriended" ? "You can't send messages — you're no longer friends." : "You can only message users you are friends with."}
              </span>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10, position: "relative" }}>

                {/* Emoji picker popup */}
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} style={{
                    position: "absolute", bottom: "calc(100% + 10px)", left: 0,
                    background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 14,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 100,
                    width: 316, maxHeight: 300, display: "flex", flexDirection: "column",
                    overflow: "hidden",
                  }}>
                    <EmojiPicker onSelect={insertEmoji} />
                  </div>
                )}

                {/* Emoji toggle button */}
                <button
                  onClick={() => setShowEmojiPicker(v => !v)}
                  title="Emoji"
                  style={{
                    width: 44, height: 44, flexShrink: 0,
                    background: showEmojiPicker ? "#7c5cfc22" : "none",
                    border: "1px solid " + (showEmojiPicker ? "#7c5cfc55" : "#2a2a3a"),
                    borderRadius: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={e => { if (!showEmojiPicker) e.currentTarget.style.background = "#1a1a24"; }}
                  onMouseLeave={e => { if (!showEmojiPicker) e.currentTarget.style.background = "none"; }}
                >
                  😊
                </button>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={chatName ? `Message ${chatName}…` : "Type a message…"}
                  rows={1}
                  style={{
                    flex: 1, height: 44, maxHeight: 120, resize: "none",
                    background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12,
                    padding: "10px 14px", color: "#e8e8f0", fontSize: 14,
                    fontFamily: "inherit", outline: "none", lineHeight: 1.5, overflowY: "auto",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                  onBlur={e => e.target.style.borderColor = "#2a2a3a"}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  style={{
                    width: 44, height: 44, flexShrink: 0,
                    background: input.trim() ? "#7c5cfc" : "#2a2a3a",
                    border: "none", borderRadius: 12,
                    cursor: input.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s, transform 0.1s",
                  }}
                  onMouseDown={e => { if (input.trim()) e.currentTarget.style.transform = "scale(0.92)"; }}
                  onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
              <p style={{ textAlign: "center", fontSize: 11, color: "#6b6b7f", marginTop: 6 }}>
                Enter to send · Shift+Enter for new line
              </p>
            </>
          )}
        </div>
      </div>

      {/* Group Info Panel */}
      {isGroup && showGroupInfo && (
        <GroupInfoPanel
          convInfo={{ ...convInfo, id: conversationId }}
          onClose={() => setShowGroupInfo(false)}
          onUpdated={loadConvInfo}
          onLeave={() => navigate("/chat")}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }
      `}</style>
    </div>
  );
}
