import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import Avatar from "./Avatar";

export default function GroupInfoPanel({ convInfo, onClose, onUpdated, onLeave }) {
  const { user } = useAuth();
  const isAdmin = convInfo?.my_role === "admin";
  const members = convInfo?.members || [];
  const memberIds = new Set(members.map(m => m.id));

  const [friends, setFriends] = useState([]);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(isAdmin);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(convInfo?.group_name || "");
  const [savingName, setSavingName] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [adminActionId, setAdminActionId] = useState(null); // userId being granted/revoked

  useEffect(() => {
    if (isAdmin) {
      api.get("/api/friends")
        .then(data => setFriends(data.map(f => f.friend).filter(f => !memberIds.has(f.id))))
        .catch(() => {});
    }
  }, [convInfo]);

  const filteredFriends = friends.filter(f =>
    (f.display_name || f.username).toLowerCase().includes(search.toLowerCase())
  );

  async function handleAddMember(userId) {
    try {
      await api.post(`/api/groups/${convInfo.id}/members`, { user_id: userId });
      onUpdated();
      setFriends(prev => prev.filter(f => f.id !== userId));
    } catch (e) { alert(e.message); }
  }

  async function handleRemoveMember(userId) {
    if (!confirm("Remove this member?")) return;
    try {
      await api.delete(`/api/groups/${convInfo.id}/members/${userId}`);
      onUpdated();
    } catch (e) { alert(e.message); }
  }

  async function handleLeave() {
    try {
      await api.delete(`/api/groups/${convInfo.id}/members/${user.id}`);
      onLeave();
    } catch (e) { alert(e.message); }
  }

  async function handleSaveName() {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      await api.patch(`/api/groups/${convInfo.id}`, { name: newName.trim() });
      onUpdated();
      setEditingName(false);
    } catch (e) { alert(e.message); }
    finally { setSavingName(false); }
  }

  async function handleGrantAdmin(userId) {
    setAdminActionId(userId);
    try {
      await api.patch(`/api/groups/${convInfo.id}/members/${userId}/grant-admin`);
      onUpdated();
    } catch (e) { alert(e.message); }
    finally { setAdminActionId(null); }
  }

  async function handleRevokeAdmin(userId) {
    if (!confirm("Revoke admin privileges from this member?")) return;
    setAdminActionId(userId);
    try {
      await api.patch(`/api/groups/${convInfo.id}/members/${userId}/revoke-admin`);
      onUpdated();
    } catch (e) { alert(e.message); }
    finally { setAdminActionId(null); }
  }

  const panel = {
    position: "absolute", top: 0, right: 0, bottom: 0,
    width: 280, background: "#13131a", borderLeft: "1px solid #2a2a3a",
    display: "flex", flexDirection: "column", zIndex: 10,
    animation: "slideInRight 0.2s ease",
  };

  return (
    <div style={panel}>
      {/* Header */}
      <div style={{ padding: "16px", borderBottom: "1px solid #2a2a3a", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontWeight: 700, color: "#e8e8f0", fontSize: 14 }}>Group Info</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#9898a8", padding: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {/* Group avatar + name */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#7c5cfc,#a584ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 10px" }}>👥</div>
          {editingName ? (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                autoFocus value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                style={{ flex: 1, background: "#1a1a24", border: "1px solid #7c5cfc", borderRadius: 8, padding: "6px 10px", color: "#e8e8f0", fontSize: 13, fontFamily: "inherit", outline: "none" }}
              />
              <button onClick={handleSaveName} disabled={savingName}
                style={{ background: "#7c5cfc", border: "none", borderRadius: 8, padding: "6px 10px", color: "white", cursor: "pointer", fontSize: 12 }}>
                {savingName ? "…" : "Save"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <span style={{ fontWeight: 700, color: "#e8e8f0", fontSize: 16 }}>{convInfo?.group_name}</span>
              {isAdmin && (
                <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b6b7f", padding: 2 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              )}
            </div>
          )}
          <div style={{ fontSize: 12, color: "#9898a8", marginTop: 4 }}>{members.length} members</div>
        </div>

        {/* Members list */}
        <div style={{ fontSize: 10, fontWeight: 700, color: "#6b6b7f", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Members</div>
        {members.map(m => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Avatar user={m} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.display_name || m.username}
                {m.id === user?.id && <span style={{ color: "#9898a8", fontWeight: 400 }}> (you)</span>}
              </div>
              <div style={{ fontSize: 11, color: m.role === "admin" ? "#a584ff" : "#9898a8" }}>
                {m.role === "admin" ? "👑 Admin" : "@" + m.username}
              </div>
            </div>
            {/* Admin actions on other members */}
            {isAdmin && m.id !== user?.id && (
              <div style={{ display: "flex", gap: 4 }}>
                {/* Grant / Revoke admin */}
                {m.role !== "admin" ? (
                  <button
                    onClick={() => handleGrantAdmin(m.id)}
                    disabled={adminActionId === m.id}
                    title="Make Admin"
                    style={{ background: "none", border: "1px solid #7c5cfc44", borderRadius: 6, cursor: "pointer", color: "#a584ff", padding: "2px 5px", fontSize: 12 }}>
                    {adminActionId === m.id ? "…" : "👑"}
                  </button>
                ) : (
                  <button
                    onClick={() => handleRevokeAdmin(m.id)}
                    disabled={adminActionId === m.id}
                    title="Revoke Admin"
                    style={{ background: "none", border: "1px solid #f8717144", borderRadius: 6, cursor: "pointer", color: "#f87171", padding: "2px 5px", fontSize: 12 }}>
                    {adminActionId === m.id ? "…" : "✕👑"}
                  </button>
                )}
                {/* Remove member */}
                <button onClick={() => handleRemoveMember(m.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#6b6b7f", padding: 4 }}
                  title="Remove">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add members (admin only) */}
        {isAdmin && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#6b6b7f", letterSpacing: 1, textTransform: "uppercase" }}>Add Members</div>
              <button onClick={() => setAdding(v => !v)}
                style={{ background: adding ? "#2a2a3a" : "#7c5cfc22", border: "none", borderRadius: 6, padding: "3px 8px", color: adding ? "#9898a8" : "#7c5cfc", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                {adding ? "Done" : "+ Add"}
              </button>
            </div>
            {adding && (
              <>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search friends…"
                  autoFocus
                  style={{ width: "100%", boxSizing: "border-box", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 8, padding: "8px 10px", color: "#e8e8f0", fontSize: 12, fontFamily: "inherit", outline: "none", marginBottom: 8 }}
                  onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                  onBlur={e => e.target.style.borderColor = "#2a2a3a"}
                />
                {friends.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9898a8", textAlign: "center", padding: "10px 0", background: "#1a1a24", borderRadius: 8 }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>👥</div>
                    All friends are already in this group
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9898a8", textAlign: "center", padding: "8px 0" }}>No friends match "{search}"</div>
                ) : filteredFriends.map(f => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <Avatar user={f} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#e8e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.display_name || f.username}</div>
                      <div style={{ fontSize: 11, color: "#9898a8" }}>@{f.username}</div>
                    </div>
                    <button onClick={() => handleAddMember(f.id)}
                      style={{ background: "#7c5cfc22", border: "none", borderRadius: 6, padding: "4px 10px", color: "#7c5cfc", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>
                      + Add
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Leave group */}
      <div style={{ padding: 16, borderTop: "1px solid #2a2a3a" }}>
        {isAdmin && (
          <div style={{ fontSize: 11, color: "#9898a8", textAlign: "center", marginBottom: 10, background: "#1a1a2460", borderRadius: 8, padding: "6px 10px" }}>
            💡 Leaving as admin will randomly pass your privilege to another member
          </div>
        )}
        {confirmLeave ? (
          <div>
            <p style={{ fontSize: 12, color: "#f87171", marginBottom: 8, textAlign: "center" }}>Are you sure you want to leave?</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmLeave(false)}
                style={{ flex: 1, background: "#2a2a3a", border: "none", borderRadius: 8, padding: "8px 0", color: "#9898a8", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleLeave}
                style={{ flex: 1, background: "#f87171", border: "none", borderRadius: 8, padding: "8px 0", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Leave</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmLeave(true)}
            style={{ width: "100%", background: "none", border: "1px solid #f8717140", borderRadius: 10, padding: "9px 0", color: "#f87171", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Leave Group
          </button>
        )}
      </div>

      <style>{`@keyframes slideInRight { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }`}</style>
    </div>
  );
}
