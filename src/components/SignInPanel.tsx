import { useState } from "react";
import { toast } from "sonner";

import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export function SignInPanel() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const savedFullName = fullName.trim();
        if (!savedFullName) throw new Error("Full name is required");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: savedFullName },
          },
        });
        if (error) throw error;
        toast.success("Account created. An administrator must approve your account before access is granted.");
        setMode("signin");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <div className="panel sheet overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <h1 className="font-display text-2xl font-semibold">Staff sign in</h1>
          <p className="mt-1 text-xs text-muted-ink">
            Employee records are private. Sign in to open the register.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3 p-5">
          {mode === "signup" ? (
            <label className="block">
              <span className="field-label">Full Name</span>
              <input
                type="text"
                required
                maxLength={100}
                autoComplete="name"
                className="field"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
          ) : null}
          <label className="block">
            <span className="field-label">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              className="field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">Password</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button type="submit" className="btn-accent w-full" disabled={busy}>
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button type="button" className="btn-quiet w-full" onClick={google} disabled={busy}>
            Continue with Google
          </button>
          <button
            type="button"
            className="w-full text-xs text-muted-ink hover:text-ink"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "First time here? Create a staff account"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
