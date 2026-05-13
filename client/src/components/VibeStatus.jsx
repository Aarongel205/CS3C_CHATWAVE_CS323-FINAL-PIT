// VibeStatus.jsx — Set and display activity vibes
// Friends can see your vibe in real-time via socket

import { useState, useRef, useEffect } from "react";

export const VIBES = [
  { id: "none",      label: "No Vibe",     emoji: "👤", color: "#6b6b7f", description: "Just here" },
  { id: "sleeping",  label: "Sleeping",    emoji: "😴", color: "#8b7cf6", description: "Catching some Zzz's" },
  { id: "studying",  label: "Studying",    emoji: "📚", color: "#06b6d4", description: "In study mode" },
  { id: "gaming",    label: "Gaming",      emoji: "🎮", color: "#10b981", description: "Mid-game, brb" },
  { id: "eating",    label: "Eating",      emoji: "🍜", color: "#f59e0b", description: "Nom nom nom" },
  { id: "working",   label: "Working",     emoji: "💼", color: "#3b82f6", description: "Heads down, working" },
  { id: "chilling",  label: "Chilling",    emoji: "🛋️", color: "#ec4899", description: "Just vibing" },
  { id: "outside",   label: "Outside",     emoji: "🚶", color: "#84cc16", description: "Out and about" },
  { id: "gym",       label: "At the Gym",  emoji: "💪", color: "#ef4444", description: "Getting gains" },
  { id: "music",     label: "Listening",   emoji: "🎧", color: "#a855f7", description: "In the zone" },
  { id: "watching",  label: "Watching",    emoji: "🎬", color: "#f97316", description: "Movie/show time" },
  { id: "busy",      label: "Busy",        emoji: "🔴", color: "#dc2626", description: "Can't talk rn" },
];

export function getVibe(id) {
  return VIBES.find(v => v.id === id) || VIBES[0];
}

// Small badge shown next to someone's name/avatar
export function VibeBadge({ vibeId, size = "sm" }) {
  const vibe = getVibe(vibeId);
  if (!vibeId || vibeId === "none") return null;

  const sizes = {
    xs: { fontSize: 10, padding: "1px 5px", emojiSize: 10, gap: 3 },
    sm: { fontSize: 11, padding: "2px 7px", emojiSize: 12, gap: 4 },
    md: { fontSize: 12, padding: "3px 9px", emojiSize: 14, gap: 5 },
  };
  const s = sizes[size] || sizes.sm;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: s.gap,
      background: `${vibe.color}20`,
      border: `1px solid ${vibe.color}40`,
      borderRadius: 20,
      padding: s.padding,
      fontSize: s.fontSize,
      color: vibe.color,
      fontWeight: 600,
      letterSpacing: 0.2,
      whiteSpace: "nowrap",
      lineHeight: 1,
    }}>
      <span style={{ fontSize: s.emojiSize, lineHeight: 1 }}>{vibe.emoji}</span>
      {vibe.label}
    </span>
  );
}

// The full picker panel
export function VibePicker({ currentVibeId, onSelect, onClose }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [onClose]);

  return (
    <div ref={ref} style={{
      position: "absolute",
      bottom: "calc(100% + 10px)",
      left: 0,
      zIndex: 300,
      background: "#13131a",
      border: "1px solid #2a2a3a",
      borderRadius: 18,
      padding: "14px",
      boxShadow: "0 16px 48px rgba(0,0,0,0.75)",
      width: 260,
    }}>
      {/* Header */}
      <div style={{ marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #2a2a3a" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "#e8e8f0", letterSpacing: 0.5 }}>
          ✦ Set Your Vibe
        </div>
        <div style={{ fontSize: 11, color: "#6b6b7f", marginTop: 2 }}>
          Your friends will see this next to your name
        </div>
      </div>

      {/* Vibe list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {VIBES.map(vibe => {
          const isActive = vibe.id === currentVibeId;
          const isHov = hovered === vibe.id;
          return (
            <button
              key={vibe.id}
              onClick={() => { onSelect(vibe.id); onClose(); }}
              onMouseEnter={() => setHovered(vibe.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: isActive ? `${vibe.color}18` : isHov ? "#1a1a28" : "none",
                border: `1px solid ${isActive ? vibe.color + "50" : "transparent"}`,
                borderRadius: 10,
                padding: "8px 10px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.12s ease",
                width: "100%",
              }}
            >
              {/* Emoji with colored bg */}
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `${vibe.color}18`,
                border: `1px solid ${vibe.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16,
              }}>
                {vibe.emoji}
              </div>

              {/* Label + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: isActive ? 700 : 500,
                  color: isActive ? vibe.color : "#e8e8f0",
                }}>
                  {vibe.label}
                </div>
                <div style={{ fontSize: 11, color: "#6b6b7f", marginTop: 1 }}>
                  {vibe.description}
                </div>
              </div>

              {/* Active check */}
              {isActive && (
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  background: vibe.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5L9.5 4" stroke="white" strokeWidth="1.8"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 10, color: "#4a4a5a", marginTop: 10, textAlign: "center" }}>
        Vibes are visible to your friends instantly
      </p>
    </div>
  );
}
