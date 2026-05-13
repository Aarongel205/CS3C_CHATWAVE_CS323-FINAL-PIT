import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ERROR_MESSAGES = {
  EMAIL_RATE_LIMIT: null, // shown as special banner
  EMAIL_CONFIRMATION_REQUIRED: null, // shown as special banner
};

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", username: "", displayName: "" });
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setError("");
    setErrorType("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setErrorType("");

    if (form.username.length < 3) return setError("Username must be at least 3 characters");
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return setError("Username can only contain letters, numbers, and underscores");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");

    setLoading(true);
    try {
      await signUp(form.email, form.password, form.username, form.displayName || form.username);
      setSuccess(true);
      setTimeout(() => navigate("/chat"), 1500);
    } catch (err) {
      if (err.message === "EMAIL_RATE_LIMIT") {
        setErrorType("EMAIL_RATE_LIMIT");
      } else if (err.message === "EMAIL_CONFIRMATION_REQUIRED") {
        setErrorType("EMAIL_CONFIRMATION_REQUIRED");
      } else {
        setError(err.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "30%", left: "30%", width: 380, height: 380, background: "rgba(124,92,252,0.06)", borderRadius: "50%", filter: "blur(60px)" }} />
      </div>

      <div style={{ width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, background: "#7c5cfc", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#e8e8f0" }}>ChatWave</span>
          </div>
          <p style={{ color: "#9898a8", fontSize: 13 }}>Create your account to get started</p>
        </div>

        <div style={{ background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 20, padding: 32 }}>
          <h1 style={{ color: "#e8e8f0", fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Create Account</h1>

          {/* ── Email rate limit banner ── */}
          {errorType === "EMAIL_RATE_LIMIT" && (
            <div style={{ background: "#f59e0b10", border: "1px solid #f59e0b40", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>⚠️ Email Rate Limit Reached</div>
              <div style={{ color: "#9898a8", fontSize: 12, lineHeight: 1.6 }}>
                Supabase's free tier limits confirmation emails to <strong style={{ color: "#e8e8f0" }}>2 per hour</strong>. To fix this permanently:
              </div>
              <ol style={{ color: "#9898a8", fontSize: 12, lineHeight: 2, paddingLeft: 18, marginTop: 6 }}>
                <li>Go to your <strong style={{ color: "#e8e8f0" }}>Supabase Dashboard</strong></li>
                <li>Navigate to <strong style={{ color: "#e8e8f0" }}>Authentication → Providers → Email</strong></li>
                <li>Turn <strong style={{ color: "#4ade80" }}>OFF</strong> "Confirm email"</li>
                <li>Save and try registering again</li>
              </ol>
            </div>
          )}

          {/* ── Email confirmation required ── */}
          {errorType === "EMAIL_CONFIRMATION_REQUIRED" && (
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.35)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>⚠️ Email confirmation is ON — you won't be able to log in yet</div>
              <div style={{ color: "#9898a8", fontSize: 12, lineHeight: 1.7 }}>
                Your account was created but Supabase requires email confirmation. Fix it in 30 seconds:
              </div>
              <div style={{ marginTop: 10, background: "#1a1a24", borderRadius: 8, padding: "12px 14px", border: "1px solid #2a2a3a" }}>
                <ol style={{ color: "#9898a8", fontSize: 12, lineHeight: 2.2, paddingLeft: 18, margin: 0 }}>
                  <li>Open your <strong style={{ color: "#e8e8f0" }}>Supabase Dashboard</strong></li>
                  <li><strong style={{ color: "#e8e8f0" }}>Authentication → Providers → Email</strong></li>
                  <li>Turn <strong style={{ color: "#4ade80" }}>OFF</strong> "Confirm email" → Save</li>
                  <li>Come back and <Link to="/login" style={{ color: "#a584ff", textDecoration: "none", fontWeight: 600 }}>log in</Link></li>
                </ol>
              </div>
            </div>
          )}


          {/* ── Generic error ── */}
          {error && (
            <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* ── Success ── */}
          {success && (
            <div style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, color: "#4ade80", fontSize: 13 }}>
              ✓ Account created! Redirecting…
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9898a8", marginBottom: 6 }}>Username *</label>
                <input
                  type="text" value={form.username} onChange={e => update("username", e.target.value)}
                  placeholder="johndoe" required
                  style={{ width: "100%", boxSizing: "border-box", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 10, padding: "10px 12px", color: "#e8e8f0", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                  onBlur={e => e.target.style.borderColor = "#2a2a3a"}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9898a8", marginBottom: 6 }}>Display Name</label>
                <input
                  type="text" value={form.displayName} onChange={e => update("displayName", e.target.value)}
                  placeholder="John Doe"
                  style={{ width: "100%", boxSizing: "border-box", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 10, padding: "10px 12px", color: "#e8e8f0", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                  onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                  onBlur={e => e.target.style.borderColor = "#2a2a3a"}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9898a8", marginBottom: 6 }}>Email *</label>
              <input
                type="email" value={form.email} onChange={e => update("email", e.target.value)}
                placeholder="you@example.com" required
                style={{ width: "100%", boxSizing: "border-box", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 10, padding: "10px 12px", color: "#e8e8f0", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                onBlur={e => e.target.style.borderColor = "#2a2a3a"}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9898a8", marginBottom: 6 }}>Password *</label>
              <input
                type="password" value={form.password} onChange={e => update("password", e.target.value)}
                placeholder="At least 6 characters" required
                style={{ width: "100%", boxSizing: "border-box", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 10, padding: "10px 12px", color: "#e8e8f0", fontSize: 13, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                onBlur={e => e.target.style.borderColor = "#2a2a3a"}
              />
            </div>

            <button
              type="submit" disabled={loading || success}
              style={{
                width: "100%", padding: "12px 0",
                background: loading || success ? "#2a2a3a" : "#7c5cfc",
                border: "none", borderRadius: 12,
                color: loading || success ? "#6b6b7f" : "white",
                fontSize: 14, fontWeight: 700, cursor: loading || success ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: "2px solid #6b6b7f", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                  Creating account…
                </>
              ) : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#9898a8", fontSize: 13, marginTop: 20 }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "#a584ff", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
          </p>
        </div>

        {/* Setup reminder */}
        <div style={{ marginTop: 16, background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#6b6b7f", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            🔧 Recommended Supabase Setting
          </div>
          <div style={{ fontSize: 12, color: "#9898a8", lineHeight: 1.7 }}>
            To avoid email issues, go to <strong style={{ color: "#e8e8f0" }}>Supabase Dashboard → Authentication → Providers → Email</strong> and disable <strong style={{ color: "#e8e8f0" }}>"Confirm email"</strong>. This lets users sign up and log in instantly.
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
