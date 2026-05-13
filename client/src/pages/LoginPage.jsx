import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setErrorType("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate("/chat");
    } catch (err) {
      if (err.message === "INVALID_CREDENTIALS") {
        setErrorType("INVALID_CREDENTIALS");
      } else if (err.message === "EMAIL_NOT_CONFIRMED") {
        setErrorType("EMAIL_NOT_CONFIRMED");
      } else {
        setError(err.message || "Sign in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0f", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, background: "rgba(124,92,252,0.07)", borderRadius: "50%", filter: "blur(80px)" }} />
      </div>

      <div style={{ width: "100%", maxWidth: 400 }}>
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
          <p style={{ color: "#9898a8", fontSize: 13 }}>Welcome back. Sign in to continue.</p>
        </div>

        <div style={{ background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 20, padding: 32 }}>
          <h1 style={{ color: "#e8e8f0", fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Sign In</h1>

          {/* Invalid credentials */}
          {errorType === "INVALID_CREDENTIALS" && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ color: "#f87171", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>❌ Invalid email or password</div>
              <div style={{ color: "#9898a8", fontSize: 12, lineHeight: 1.7 }}>
                Double-check your credentials. If you just created your account, your sign-up may not have completed —
                try <Link to="/register" style={{ color: "#a584ff", textDecoration: "none", fontWeight: 600 }}>registering again</Link>.
              </div>
              <div style={{ marginTop: 10, background: "#1a1a24", borderRadius: 8, padding: "10px 12px", border: "1px solid #2a2a3a" }}>
                <div style={{ color: "#6b6b7f", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Common causes</div>
                <ul style={{ color: "#9898a8", fontSize: 12, lineHeight: 1.9, paddingLeft: 16, margin: 0 }}>
                  <li>Email confirmation was ON when you signed up — check your inbox</li>
                  <li>The profile trigger failed — try registering with a different username</li>
                  <li>Wrong password — passwords are case-sensitive</li>
                </ul>
              </div>
            </div>
          )}

          {/* Email not confirmed */}
          {errorType === "EMAIL_NOT_CONFIRMED" && (
            <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 16 }}>
              <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>📧 Email Not Confirmed</div>
              <div style={{ color: "#9898a8", fontSize: 12, lineHeight: 1.6 }}>
                Check your inbox for a confirmation email and click the link. Or disable email confirmation in your Supabase dashboard:
                <br /><strong style={{ color: "#e8e8f0" }}>Authentication → Providers → Email → turn off "Confirm email"</strong>
              </div>
            </div>
          )}

          {/* Generic error */}
          {error && (
            <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, color: "#f87171", fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9898a8", marginBottom: 6 }}>Email</label>
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError(""); setErrorType(""); }}
                placeholder="you@example.com" required
                style={{ width: "100%", boxSizing: "border-box", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 10, padding: "11px 14px", color: "#e8e8f0", fontSize: 14, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                onBlur={e => e.target.style.borderColor = "#2a2a3a"}
              />
            </div>

            <div style={{ marginBottom: 22 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#9898a8", marginBottom: 6 }}>Password</label>
              <input
                type="password" value={password}
                onChange={e => { setPassword(e.target.value); setError(""); setErrorType(""); }}
                placeholder="••••••••" required
                style={{ width: "100%", boxSizing: "border-box", background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: 10, padding: "11px 14px", color: "#e8e8f0", fontSize: 14, fontFamily: "inherit", outline: "none" }}
                onFocus={e => e.target.style.borderColor = "#7c5cfc"}
                onBlur={e => e.target.style.borderColor = "#2a2a3a"}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "12px 0",
                background: loading ? "#2a2a3a" : "#7c5cfc",
                border: "none", borderRadius: 12,
                color: loading ? "#6b6b7f" : "white",
                fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "background 0.15s",
              }}
            >
              {loading ? (
                <>
                  <div style={{ width: 14, height: 14, border: "2px solid #6b6b7f", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                  Signing in…
                </>
              ) : "Sign In"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#9898a8", fontSize: 13, marginTop: 20 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#a584ff", fontWeight: 600, textDecoration: "none" }}>Create one</Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
