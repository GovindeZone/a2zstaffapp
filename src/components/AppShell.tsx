import { Link, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { InstallApp } from "@/components/InstallApp";
import { SignInPanel } from "@/components/SignInPanel";
import { useAuth, type AppTab } from "@/hooks/useAuth";

const NAV: { to: "/" | "/employees" | "/attendance" | "/salary" | "/recruitment" | "/user-control"; label: string; tab: AppTab }[] = [
  { to: "/", label: "Dashboard", tab: "dashboard" },
  { to: "/employees", label: "Employees", tab: "employees" },
  { to: "/attendance", label: "Attendance", tab: "attendance" },
  { to: "/salary", label: "Salary", tab: "salary" },
  { to: "/recruitment", label: "Recruitment", tab: "recruitment" },
  { to: "/user-control", label: "User Control", tab: "user_control" },
];

function BrandHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-3 px-5 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-accent font-display text-lg font-bold leading-none text-accent-foreground">
            A·Z
          </div>
          <div className="min-w-0">
            <div className="font-display text-3xl font-bold leading-none tracking-tight">A to Z</div>
            <div className="mt-0.5 truncate text-[11px] tracking-wide text-muted-ink">
              OMR Road, Navalur Junction, Chennai
            </div>
          </div>
        </div>
        {children}
      </div>
    </header>
  );
}

function AccessMessage({ title, message }: { title: string; message: string }) {
  return (
    <section className="panel mx-auto max-w-xl p-6 text-center">
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted-ink">{message}</p>
    </section>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { session, profile, loading, signOut, isAdmin, canAccess } = useAuth();
  const location = useLocation();

  const metadata = session?.user.user_metadata;
  const fullName =
    (typeof metadata?.["full_name"] === "string" && metadata["full_name"].trim()) ||
    (typeof metadata?.["name"] === "string" && metadata["name"].trim()) ||
    profile?.full_name ||
    session?.user.email ||
    "Signed-in user";

  const currentNav = NAV.find((item) => item.to === location.pathname);

  const renderContent = () => {
    if (!profile) {
      return (
        <AccessMessage
          title="Preparing your account"
          message="Your user profile is being created. Please wait a moment and refresh if this message remains."
        />
      );
    }

    if (profile.status === "pending") {
      return (
        <AccessMessage
          title="Waiting for approval"
          message="Your account has been created successfully. An administrator must approve your account before you can access the employee register."
        />
      );
    }

    if (profile.status === "rejected") {
      return (
        <AccessMessage
          title="Access not approved"
          message="Your account is currently not approved for access. Please contact the administrator."
        />
      );
    }

    if (currentNav && !canAccess(currentNav.tab)) {
      return (
        <AccessMessage
          title="Access restricted"
          message="The administrator has not granted your account access to this tab."
        />
      );
    }

    return children;
  };

  const visibleNav = NAV.filter((item) => canAccess(item.tab));

  return (
    <div className="min-h-screen bg-ground font-body text-ink">
      <BrandHeader>
        {session ? (
          <>
            <nav className="hidden items-center gap-1 text-sm font-medium md:flex">
              {visibleNav.map((item) => (
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
            <div className="ml-auto flex min-w-0 items-center gap-2">
              <InstallApp />
              <button className="btn-quiet text-sm" onClick={() => void signOut()}>
                Sign out
              </button>
              <div
                className="max-w-52 break-words text-right text-sm font-semibold leading-5 text-ink sm:max-w-64"
                title={fullName}
              >
                {fullName}
              </div>
            </div>
          </>
        ) : (
          <InstallApp />
        )}
      </BrandHeader>

      {session ? (
        <div className="flex gap-1 overflow-x-auto border-b border-line px-5 pb-2 pt-2 text-sm font-medium md:hidden">
          {visibleNav.map((item) => (
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
          renderContent()
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
