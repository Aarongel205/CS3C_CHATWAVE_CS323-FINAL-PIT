import { createContext, useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, getSession } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [vibeStatuses, setVibeStatuses] = useState(new Map()); // userId -> vibeId

  useEffect(() => {
    if (!user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    async function connect() {
      const session = await getSession();
      if (!session) return;

      const socket = io(import.meta.env.VITE_API_URL || "http://localhost:4000", {
        auth: { token: session.access_token },
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
      });

      socket.on("connect", async () => {
        setConnected(true);
        // Re-broadcast saved vibe on reconnect so others see it immediately
        const savedVibe = localStorage.getItem("my_vibe_id");
        if (savedVibe && savedVibe !== "none") {
          socket.emit("set_vibe", { vibe_id: savedVibe });
        }
      });
      socket.on("disconnect", () => setConnected(false));
      socket.on("user_online", (uid) => setOnlineUsers(p => new Set([...p, uid])));
      // Bulk snapshot of all active vibes sent on connect
      socket.on("all_vibes", (vibesObj) => {
        setVibeStatuses(new Map(Object.entries(vibesObj)));
      });

      socket.on("vibe_changed", ({ user_id, vibe_id }) => {
        setVibeStatuses(p => {
          const m = new Map(p);
          if (!vibe_id || vibe_id === "none") {
            m.delete(user_id);
          } else {
            m.set(user_id, vibe_id);
          }
          return m;
        });
      });
      socket.on("user_offline", (uid) => setOnlineUsers(p => { const s = new Set(p); s.delete(uid); return s; }));

      socketRef.current = socket;
      // Trigger a re-render so consumers get the updated ref
      setConnected(false); // will flip to true on "connect"
    }

    connect();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  // Always reads the LIVE socket — no stale closure
  function on(event, handler) {
    const socket = socketRef.current;
    if (!socket) return () => {};
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }

  function emit(event, data) {
    socketRef.current?.emit(event, data);
  }

  function joinConversations(ids) {
    if (ids?.length) socketRef.current?.emit("join_conversations", ids);
  }

  function sendMessage(conversation_id, content) {
    socketRef.current?.emit("send_message", { conversation_id, content });
  }

  function startTyping(conversation_id) {
    socketRef.current?.emit("typing_start", { conversation_id });
  }

  function setVibe(vibe_id) {
    socketRef.current?.emit("set_vibe", { vibe_id });
  }

  function stopTyping(conversation_id) {
    socketRef.current?.emit("typing_stop", { conversation_id });
  }

  // Expose the raw socket so components can attach listeners after connect
  function getSocket() {
    return socketRef.current;
  }

  return (
    <SocketContext.Provider value={{
      connected,
      onlineUsers,
      vibeStatuses,
      setVibe,
      on,
      emit,
      joinConversations,
      sendMessage,
      startTyping,
      stopTyping,
      getSocket,
      socketRef,
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
