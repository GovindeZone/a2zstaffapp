import { Link, useLocation } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { InstallApp } from "@/components/InstallApp";
import { SignInPanel } from "@/components/SignInPanel";
import { useAuth, type AppTab } from "@/hooks/useAuth";

const NAV: { to: "/" | "/employees" | "/attendance" | "/salary" | "/recruitment" | "/user-control"; label: string; tab: AppTab }[] = [
  { to: "/", label: "Dashboard", tab: "dashboard" },
  { to: "/employees", label: "Staff", tab: "employees" },
  { to: "/attendance", label: "Attendance", tab: "attendance" },
  { to: "/salary", label: "Salary", tab: "salary" },
  { to: "/recruitment", label: "Recruitment", tab: "recruitment" },
  { to: "/user-control", label: "User Control", tab: "user_control" },
];

function BrandHeader({ children }: { children?: ReactNode }) {
  return <header className="sticky top-0 z-40 border-b border-line bg-ground/95 backdrop-blur"><div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3"><div className="flex min-w-0 items-center gap-3"><div className="grid size-11 place-items-center rounded-xl bg-accent font-display text-lg font-bold leading-none text-accent-foreground">A·Z</div><div className="min-w-0"><div className="font-display text-3xl font-extrabold leading-none tracking-tight">A to Z Shop</div><div className="mt-0.5 truncate text-[11px] tracking-wide text-muted-ink">OMR Road, Navalur Junction, Chennai</div></div></div>{children}</div></header>;
}

function AccessMessage({ title, message }: { title: string; message: string }) {
  return <section className="panel mx-auto max-w-xl p-6 text-center"><h1 className="font-display text-2xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-ink">{message}</p></section>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, profile, loading, signOut, canAccess } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metadata = session?.user.user_metadata;
  const fullName = (typeof metadata?.["full_name"] === "string" && metadata["full_name"].trim()) || (typeof metadata?.["name"] === "string" && metadata["name"].trim()) || profile?.full_name || session?.user.email || "Signed-in user";
  const currentNav = NAV.find((item) => item.to === location.pathname);

  useEffect(() => {
    if (!session) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
      return;
    }

    const resetInactivityTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        void signOut();
      }, 10 * 60 * 1000);
    };

    const activityEvents = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];
    activityEvents.forEach((event) => window.addEventListener(event, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      activityEvents.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [session, signOut]);

  const handleSignOut = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      void signOut();
    }
  };

  const renderContent = () => {
    if (!profile) return <AccessMessage title="Preparing your account" message="Your user profile is being created. Please wait a moment and refresh if this message remains." />;
    if (profile.status === "pending") return <AccessMessage title="Waiting for approval" message="Your account has been created successfully. An administrator must approve your account before you can access the staff register." />;
    if (profile.status === "rejected") return <AccessMessage title="Access not approved" message="Your account is currently not approved for access. Please contact the administrator." />;
    if (profile.status === "disabled") return <AccessMessage title="Account disabled" message="Your account is temporarily disabled. Please contact the administrator to restore access." />;
    if (currentNav && !canAccess(currentNav.tab)) return <AccessMessage title="Access restricted" message="The administrator has not granted your account access to this tab." />;
    return children;
  };

  const visibleNav = NAV.filter((item) => canAccess(item.tab));

  return <div className="min-h-screen bg-ground font-body text-ink"><BrandHeader>{session ? <div className="ml-auto flex min-w-0 items-center gap-2"><InstallApp /><div className="max-w-52 break-words text-right text-xs font-semibold leading-5 text-ink sm:max-w-64" title={fullName}>{fullName}</div><button className="btn-quiet p-2" onClick={handleSignOut} aria-label="Sign out" title="Sign out"><LogOut className="size-4" /></button><div className="relative"><button className="btn-quiet text-xs" aria-expanded={menuOpen} aria-haspopup="menu" onClick={() => setMenuOpen((open) => !open)}>Menu <span aria-hidden="true">▾</span></button>{menuOpen ? <div className="absolute right-0 top-full z-50 mt-2 min-w-48 rounded-xl border border-line bg-ground p-2 shadow-lg" role="menu">{visibleNav.map((item) => <Link key={item.to} to={item.to} activeOptions={{ exact: item.to === "/" }} className="block rounded-lg px-3 py-2 text-sm text-muted-ink hover:bg-accent/10 hover:text-ink" activeProps={{ className: "block rounded-lg px-3 py-2 text-sm bg-accent/10 text-accent" }} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</div> : null}</div></div> : <InstallApp />}</BrandHeader><main className="mx-auto max-w-[1200px] space-y-5 px-5 py-6">{loading ? <p className="py-20 text-center text-sm text-muted-ink">Opening the register…</p> : session ? renderContent() : <SignInPanel />}</main><footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-6 text-[11px] text-muted-ink"><span>A to Z Shop · OMR Road, Navalur Junction, Chennai</span><span className="font-mono tabular-nums">HR attendance &amp; payroll register</span></footer></div>;
}
