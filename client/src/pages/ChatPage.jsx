import { useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";

export default function ChatPage() {
  const { conversationId } = useParams();
  const [conversations, setConversations] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "#0a0a0f",
      }}
    >
      <Sidebar
        conversations={conversations}
        setConversations={setConversations}
        pendingCount={pendingCount}
        setPendingCount={setPendingCount}
      />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <ChatWindow conversationId={conversationId} />
      </div>
    </div>
  );
}
