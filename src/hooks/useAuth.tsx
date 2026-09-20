import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "user";
export type UserStatus = "pending" | "approved" | "rejected";
export type AppTab = "dashboard" | "employees" | "attendance" | "salary" | "recruitment" | "user_control";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  status: UserStatus;
  allowed_tabs: AppTab[];
  created_at: string;
  updated_at: string;
}

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  canAccess: (tab: AppTab) => boolean;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  isAdmin: false,
  canAccess: () => false,
});

async function loadProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase.rpc("ensure_my_profile");
  if (error) {
    console.error("Could not ensure user profile", error);
    return null;
  }
  const profile = Array.isArray(data) ? data[0] : data;
  return (profile as UserProfile | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!session) {
      setProfile(null);
      return;
    }
    setProfile(await loadProfile());
  };

  useEffect(() => {
    let mounted = true;

    const initialise = async () => {
      const { data: current } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(current.session);
      if (current.session) {
        const nextProfile = await loadProfile();
        if (mounted) setProfile(nextProfile);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    };

    void initialise();

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted) return;
      setSession(next);
      if (!next) {
        setProfile(null);
        setLoading(false);
        return;
      }

      void loadProfile().then((nextProfile) => {
        if (mounted) {
          setProfile(nextProfile);
          setLoading(false);
        }
      });
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const isAdmin = profile?.role === "admin" && profile.status === "approved";
  const canAccess = (tab: AppTab) =>
    isAdmin || (profile?.status === "approved" && profile.allowed_tabs.includes(tab));

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile, isAdmin, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
