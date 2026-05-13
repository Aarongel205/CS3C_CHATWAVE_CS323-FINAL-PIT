import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import Avatar from "../components/Avatar";
import { format } from "date-fns";

export default function ProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isMe, setIsMe] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState(null); // null | 'pending' | 'friends' | 'sent'
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
    checkFriendStatus();
  }, [userId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await api.get(`/api/profile/${userId}`);
      setProfile(data);
      setIsMe(data.id === user?.id);
      setForm({ display_name: data.display_name || "", bio: data.bio || "", avatar_url: data.avatar_url || "" });
    } catch {
      navigate("/chat");
    } finally {
      setLoading(false);
    }
  }

  async function checkFriendStatus() {
    if (userId === user?.id) return;
    try {
      const [friends, sent, requests] = await Promise.all([
        api.get("/api/friends"),
        api.get("/api/friends/sent"),
        api.get("/api/friends/requests"),
      ]);

      if (friends.some((f) => f.friend.id === userId)) {
        setFriendStatus("friends");
      } else if (sent.some((r) => r.receiver.id === userId)) {
        setFriendStatus("sent");
      } else if (requests.some((r) => r.sender.id === userId)) {
        setFriendStatus("received");
      } else {
        setFriendStatus(null);
      }
    } catch {}
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = await api.patch("/api/profile", form);
      setProfile(data);
      setEditing(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFriend() {
    try {
      await api.post("/api/friends/request", { receiver_id: userId });
      setFriendStatus("sent");
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleMessage() {
    try {
      const { conversation_id } = await api.post("/api/conversations", { friend_id: userId });
      navigate(`/chat/${conversation_id}`);
    } catch {}
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Back button */}
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-text-muted hover:text-text transition-colors text-sm mb-6"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </button>

        {/* Profile card */}
        <div className="card p-8 animate-fade-in">
          <div className="flex items-start gap-6">
            <Avatar user={profile} size="2xl" />

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Display Name</label>
                    <input
                      className="input-base"
                      value={form.display_name}
                      onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Bio</label>
                    <textarea
                      className="input-base resize-none"
                      rows={3}
                      value={form.bio}
                      onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                      placeholder="Tell something about yourself..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-muted mb-1">Avatar URL</label>
                    <input
                      className="input-base"
                      value={form.avatar_url}
                      onChange={(e) => setForm((f) => ({ ...f, avatar_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSave} disabled={saving} className="btn-primary">
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button onClick={() => setEditing(false)} className="btn-ghost">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-text">{profile.display_name || profile.username}</h1>
                  <div className="text-text-muted mt-1">@{profile.username}</div>

                  {profile.bio && (
                    <p className="text-text mt-3 text-sm leading-relaxed">{profile.bio}</p>
                  )}

                  <div className="flex items-center gap-2 mt-4 text-xs text-text-muted">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Joined {format(new Date(profile.created_at), "MMMM yyyy")}
                  </div>

                  <div className="flex gap-3 mt-5">
                    {isMe ? (
                      <button onClick={() => setEditing(true)} className="btn-primary">
                        Edit Profile
                      </button>
                    ) : (
                      <>
                        {friendStatus === "friends" && (
                          <button onClick={handleMessage} className="btn-primary">
                            💬 Send Message
                          </button>
                        )}
                        {friendStatus === null && (
                          <button onClick={handleAddFriend} className="btn-primary">
                            + Add Friend
                          </button>
                        )}
                        {friendStatus === "sent" && (
                          <button disabled className="btn-ghost opacity-60 cursor-default">
                            ✓ Request Sent
                          </button>
                        )}
                        {friendStatus === "received" && (
                          <span className="text-sm text-text-muted">Sent you a friend request</span>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: "Username", value: `@${profile.username}` },
            { label: "Status", value: isMe ? "It's you!" : friendStatus === "friends" ? "Friends" : "Not friends" },
            { label: "Member since", value: format(new Date(profile.created_at), "MMM yyyy") },
          ].map((stat) => (
            <div key={stat.label} className="card p-4 text-center">
              <div className="text-sm font-semibold text-text truncate">{stat.value}</div>
              <div className="text-xs text-text-muted mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
