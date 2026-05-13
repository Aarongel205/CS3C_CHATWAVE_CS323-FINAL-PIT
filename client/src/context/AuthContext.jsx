import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // After any successful login, make sure the profile row exists in the DB.
  // This is the safety net for when the Supabase trigger silently failed.
  async function ensureProfileExists(session, meta = {}) {
    if (!session?.access_token) return;
    try {
      await fetch(`${API_URL}/api/auth/ensure-profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(meta),
      });
    } catch (e) {
      // Non-fatal — the app will still work, profile loads lazily
      console.warn("ensure-profile failed:", e.message);
    }
  }

  async function signUp(email, password, username, displayName) {
    // Step 1: Create the Supabase auth account
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: displayName || username },
      },
    });

    if (error) {
      // Rate limit on confirmation emails
      if (
        error.message?.toLowerCase().includes("rate limit") ||
        error.message?.toLowerCase().includes("email rate") ||
        error.status === 429
      ) {
        throw new Error("EMAIL_RATE_LIMIT");
      }
      throw error;
    }

    // Step 2a: Email confirmation is OFF — user is logged in immediately
    if (data.session) {
      // Ensure the profile row exists (trigger may be slow or failed)
      await ensureProfileExists(data.session, { username, display_name: displayName || username });
      return data;
    }

    // Step 2b: Email confirmation is ON — user was created but needs to confirm
    // The account EXISTS in Supabase but won't be usable until confirmed.
    if (data.user && !data.session) {
      throw new Error("EMAIL_CONFIRMATION_REQUIRED");
    }

    return data;
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message?.toLowerCase() || "";

      if (msg.includes("invalid login") || msg.includes("invalid credentials") || msg.includes("invalid email or password")) {
        throw new Error("INVALID_CREDENTIALS");
      }
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        throw new Error("EMAIL_NOT_CONFIRMED");
      }
      // Surface the raw Supabase error for everything else
      throw error;
    }

    // Guarantee the profile row exists — this fixes accounts where the
    // trigger failed silently during registration
    if (data.session) {
      await ensureProfileExists(data.session, {
        username: data.user?.user_metadata?.username,
        display_name: data.user?.user_metadata?.display_name,
      });
    }

    return data;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, getSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
