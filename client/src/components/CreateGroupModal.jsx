import { useState, useEffect } from "react";
import { api } from "../lib/api";
import Avatar from "./Avatar";

export default function CreateGroupModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1); // 1 = name, 2 = members
  const [groupName, setGroupName] = useState("");
  const [friends, setFriends] = useState([]);
  const [selected, setSelected] = useState([]); // array of friend objects
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api.get("/api/friends")
      .then(data => setFriends(data.map(f => f.friend)))
      .catch(() => {});
  }, []);

  const filtered = friends.filter(f =>
    (f.display_name || f.username || "").toLowerCase().includes(search.toLowerCase()) ||
    f.username.toLowerCase().includes(search.toLowerCase())
  );

  function toggleMember(friend) {
    setSelected(prev =>
      prev.find(s => s.id === friend.id)
        ? prev.filter(s => s.id !== friend.id)
        : [...prev, friend]
    );
  }

  async function handleCreate() {
    if (!groupName.trim()) return setError("Group name is required");
    if (selected.length === 0) return setError("Add at least one member");
    setCreating(true);
    setError("");
    try {
      const result = await api.post("/api/groups", {
        name: groupName.trim(),
        member_ids: selected.map(s => s.id),
      });
      onCreated(result.conversation_id);
    } catch (e) {
      setError(e.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  // Backdrop click closes
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose();
  }

  const modalStyle = {
    position: "fixed", inset: 0, zIndex: 50,
    background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16,
  };

  const cardStyle = {
    background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 20,
    width: "100%", maxWidth: 420,
    boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
    animation: "slideUp 0.2s ease",
    overflow: "hidden",
  };

  return (
    <div style={modalStyle} onClick={handleBackdrop}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ color: "#e8e8f0", fontWeight: 700, fontSize: 17, margin: 0 }}>
              {step === 1 ? "New Group Chat" : "Add Members"}
            </h2>
            <p style={{ color: "#9898a8", fontSize: 12, marginTop: 3 }}>
              {step === 1 ? "Give your group a name" : `${selected.length} selected`}
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: "#1a1a24", border: "none", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9898a8" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "14px 0 0" }}>
          {[1, 2].map(s => (
            <div key={s} style={{ width: s === step ? 20 : 7, height: 7, borderRadius: 99, background: s === step ? "#7c5cfc" : "#2a2a3a", transition: "all 0.2s" }} />
          ))}
        </div>

        <div style={{ padding: 20 }}>

          {/* ── Step 1: Name ── */}
          {step === 1 && (
            <div>
              {/* Group icon preview */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #7c5cfc, #a584ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>
                  👥
                </div>
              </div>

              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9898a8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Group Name
              </label>
              <input
                autoFocus
                type="text"
                value={groupName}
                onChange={e => { setGroupName(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && groupName.trim() && setStep(2)}
                placeholder="e.g. Study Group, Team Alpha…"
                maxLength={60}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12,
                  padding: "12px 14px", color: "#e8e8f0", fontSize: 14,
                  fontFamily: "inherit", outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                onBlur={e => e.target.style.borderColor = "#2a2a3a"}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                <span style={{ fontSize: 11, color: "#6b6b7f" }}>{groupName.length}/60</span>
              </div>

              {error && <p style={{ color: "#f87171", fontSize: 12, marginTop: 8 }}>{error}</p>}
            </div>
          )}

          {/* ── Step 2: Members ── */}
          {step === 2 && (
            <div>
              {/* Selected chips */}
              {selected.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {selected.map(s => (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 5, background: "#7c5cfc22", border: "1px solid #7c5cfc55", borderRadius: 99, padding: "4px 10px 4px 6px" }}>
                      <Avatar user={s} size="xs" />
                      <span style={{ fontSize: 12, color: "#a584ff", fontWeight: 600 }}>{s.display_name || s.username}</span>
                      <button onClick={() => toggleMember(s)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9898a8", padding: 0, lineHeight: 1, marginLeft: 2, fontSize: 14 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search */}
              <div style={{ position: "relative", marginBottom: 10 }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b6b7f" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search friends…"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 10,
                    padding: "9px 12px 9px 30px", color: "#e8e8f0", fontSize: 13,
                    fontFamily: "inherit", outline: "none",
                  }}
                  onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                  onBlur={e => e.target.style.borderColor = "#2a2a3a"}
                />
              </div>

              {/* Friends list */}
              <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 4 }}>
                {filtered.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#9898a8", fontSize: 13, padding: "20px 0" }}>
                    {friends.length === 0 ? "You have no friends yet" : "No results"}
                  </div>
                ) : filtered.map(friend => {
                  const isSelected = !!selected.find(s => s.id === friend.id);
                  return (
                    <button key={friend.id} onClick={() => toggleMember(friend)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        background: isSelected ? "#7c5cfc15" : "none",
                        border: "none", cursor: "pointer", borderRadius: 10, padding: "8px 10px",
                        marginBottom: 2, transition: "background 0.12s",
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#1a1a24"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "none"; }}
                    >
                      <Avatar user={friend} size="sm" />
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#e8e8f0" }}>{friend.display_name || friend.username}</div>
                        <div style={{ fontSize: 11, color: "#9898a8" }}>@{friend.username}</div>
                      </div>
                      {/* Checkbox */}
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        border: isSelected ? "none" : "2px solid #2a2a3a",
                        background: isSelected ? "#7c5cfc" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                        {isSelected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {error && <p style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>{error}</p>}
            </div>
          )}

          {/* Footer buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {step === 2 && (
              <button onClick={() => setStep(1)}
                style={{ flex: 1, padding: "11px 0", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 12, color: "#9898a8", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Back
              </button>
            )}
            {step === 1 ? (
              <button
                onClick={() => { if (!groupName.trim()) return setError("Group name is required"); setError(""); setStep(2); }}
                style={{ flex: 1, padding: "11px 0", background: "#7c5cfc", border: "none", borderRadius: 12, color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                Next →
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating || selected.length === 0}
                style={{
                  flex: 1, padding: "11px 0", background: creating || selected.length === 0 ? "#2a2a3a" : "#7c5cfc",
                  border: "none", borderRadius: 12, color: creating || selected.length === 0 ? "#6b6b7f" : "white",
                  fontSize: 14, fontWeight: 600, cursor: creating || selected.length === 0 ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}>
                {creating ? (
                  <>
                    <div style={{ width: 14, height: 14, border: "2px solid #6b6b7f", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                    Creating…
                  </>
                ) : `Create Group${selected.length > 0 ? ` (${selected.length + 1})` : ""}`}
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
