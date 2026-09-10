import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SignInPanel } from "@/components/SignInPanel";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { to: "/", label: "Dashboard" },
  { to: "/employees", label: "Employees" },
  { to: "/attendance", label: "Attendance" },
  { to: "/salary", label: "Salary" },
] as const;

function BrandHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-accent font-display text-lg font-bold leading-none text-accent-foreground">
            A·Z
          </div>
          <div>
            <div className="font-display text-3xl font-bold leading-none tracking-tight">
              A to Z
            </div>
            <div className="mt-0.5 text-[11px] tracking-wide text-muted-ink">
              OMR Road, Navalur Junction, Chennai
            </div>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, loading, signOut } = useAuth();

  const initials =
    session?.user.email
      ?.split("@")[0]
      .slice(0, 2)
      .toUpperCase() ?? "AZ";

  return (
    <div className="min-h-screen bg-ground font-body text-ink">
      <BrandHeader>
        {session ? (
          <>
            <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className="rounded-lg px-3 py-2 text-muted-ink transition-colors hover:text-ink"
                  activeProps={{ className: "bg-accent/10 text-accent" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <button className="btn-quiet text-sm" onClick={() => void signOut()}>
                Sign out
              </button>
              <div className="grid size-9 place-items-center rounded-full bg-ink/10 font-display text-sm font-semibold">
                {initials}
              </div>
            </div>
          </>
        ) : null}
      </BrandHeader>

      {session ? (
        <div className="flex gap-1 overflow-x-auto border-b border-line px-5 pb-2 pt-2 text-sm font-medium md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-muted-ink"
              activeProps={{ className: "text-accent bg-accent/10" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}

      <main className="mx-auto max-w-[1200px] space-y-5 px-5 py-6">
        {loading ? (
          <p className="py-20 text-center text-sm text-muted-ink">Opening the register…</p>
        ) : session ? (
          children
        ) : (
          <SignInPanel />
        )}
      </main>

      <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-6 text-[11px] text-muted-ink">
        <span>A to Z · OMR Road, Navalur Junction, Chennai</span>
        <span className="font-mono tabular-nums">HR attendance &amp; payroll register</span>
      </footer>
    </div>
  );
}
