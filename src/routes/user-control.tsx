import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Shield, UserCheck, UserX } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { useAuth, type AppTab, type UserProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/user-control")({
  head: () => ({ meta: [{ title: "User Control — A to Z HR Register" }, { name: "description", content: "Administrator user approval and tab access control." }] }),
  component: UserControl,
});

const ACCESS_TABS: { key: Exclude<AppTab, "user_control">; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "employees", label: "Employees" },
  { key: "attendance", label: "Attendance" },
  { key: "salary", label: "Salary" },
  { key: "recruitment", label: "Recruitment" },
];

function UserControl() {
  const { isAdmin, profile, refreshProfile } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    const db = supabase as unknown as { rpc: (fn: string, args?: Record<string, unknown>) => any };
    const { data, error } = await db.rpc("admin_list_users");
    if (error) toast.error(error.message);
    else setUsers((data as UserProfile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) void loadUsers();
  }, [isAdmin]);

  const updateUser = async (userId: string, changes: { status?: UserProfile["status"]; allowed_tabs?: AppTab[] }) => {
    setBusyId(userId);
    const db = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => any };
    const { error } = await db.rpc("admin_update_user", {
      target_user_id: userId,
      new_status: changes.status ?? null,
      new_allowed_tabs: changes.allowed_tabs ?? null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("User updated");
      await loadUsers();
    }
    setBusyId(null);
  };

  const transferAdmin = async (userId: string) => {
    if (!window.confirm("Transfer administrator access to this user? You will become a User.")) return;
    setBusyId(userId);
    const db = supabase as unknown as { rpc: (fn: string, args: Record<string, unknown>) => any };
    const { error } = await db.rpc("transfer_admin", { target_user_id: userId });
    if (error) {
      toast.error(error.message);
      setBusyId(null);
      return;
    }
    toast.success("Administrator access transferred. You are now a User.");
    await refreshProfile();
    setBusyId(null);
  };

  if (!isAdmin || profile?.role !== "admin") {
    return <AppShell><section className="panel p-6 text-center"><h1 className="font-display text-2xl font-semibold">User Control</h1><p className="mt-2 text-sm text-muted-ink">Only the administrator can manage users.</p></section></AppShell>;
  }

  return (
    <AppShell>
      <section className="panel p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-ink">Administration</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">User Control</h1>
        <p className="mt-1 text-sm text-muted-ink">Approve users, reject access, and control tab permissions.</p>
      </section>
      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-4"><h2 className="font-display text-lg font-semibold">Users</h2><p className="mt-1 text-xs text-muted-ink">New registrations remain pending until approved.</p></div>
        {loading ? <p className="p-6 text-center text-sm text-muted-ink">Loading users…</p> : <div className="divide-y divide-line">{users.map((user) => <UserRow key={user.id} user={user} busy={busyId === user.id} onUpdate={updateUser} onTransferAdmin={transferAdmin} />)}</div>}
      </section>
    </AppShell>
  );
}

function UserRow({ user, busy, onUpdate, onTransferAdmin }: { user: UserProfile; busy: boolean; onUpdate: (id: string, changes: { status?: UserProfile["status"]; allowed_tabs?: AppTab[] }) => Promise<void>; onTransferAdmin: (id: string) => Promise<void> }) {
  const [tabs, setTabs] = useState<AppTab[]>(user.allowed_tabs);
  useEffect(() => setTabs(user.allowed_tabs), [user.allowed_tabs]);
  const isAdmin = user.role === "admin";
  const toggleTab = (tab: Exclude<AppTab, "user_control">) => {
    if (isAdmin) return;
    setTabs((current) => current.includes(tab) ? current.filter((item) => item !== tab) : [...current, tab]);
  };

  return (
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{user.full_name || "Unnamed user"}</h3><span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">{user.role}</span><StatusBadge status={user.status} /></div><p className="mt-1 break-all text-xs text-muted-ink">{user.email}</p></div>
        {!isAdmin ? <div className="flex flex-wrap gap-2">{user.status !== "approved" && <button className="btn-accent inline-flex items-center gap-1.5" disabled={busy} onClick={() => void onUpdate(user.id, { status: "approved" })}><UserCheck className="size-4" />Approve</button>}{user.status !== "rejected" && <button className="btn-quiet inline-flex items-center gap-1.5" disabled={busy} onClick={() => void onUpdate(user.id, { status: "rejected" })}><UserX className="size-4" />Reject</button>}{user.status === "approved" && <button className="btn-quiet inline-flex items-center gap-1.5" disabled={busy} onClick={() => void onTransferAdmin(user.id)}><Shield className="size-4" />Make Admin</button>}</div> : <span className="text-xs text-muted-ink">Full access</span>}
      </div>
      {!isAdmin && <div className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Allowed tabs</p><p className="mt-0.5 text-xs text-muted-ink">Select the tabs this User can access.</p></div><button className="btn-quiet inline-flex items-center gap-1.5" disabled={busy || user.status !== "approved"} onClick={() => void onUpdate(user.id, { allowed_tabs: tabs })}><Check className="size-4" />Save access</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{ACCESS_TABS.map((item) => <label key={item.key} className={`flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm ${user.status !== "approved" ? "opacity-50" : ""}`}><input type="checkbox" checked={tabs.includes(item.key)} disabled={busy || user.status !== "approved"} onChange={() => toggleTab(item.key)} />{item.label}</label>)}</div></div>}
    </div>
  );
}

function StatusBadge({ status }: { status: UserProfile["status"] }) {
  const label = status === "approved" ? "Approved" : status === "pending" ? "Pending" : "Rejected";
  return <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-ink">{label}</span>;
}
