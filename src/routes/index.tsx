import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { useAttendanceRange, useEmployees } from "@/lib/queries";
import { todayISO } from "@/lib/hr";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — A to Z Shop" },
      {
        name: "description",
        content: "Daily attendance summary for A to Z Shop, Navalur Junction, Chennai.",
      },
      { property: "og:title", content: "Dashboard — A to Z Shop" },
      {
        property: "og:description",
        content: "Present, absent and total employee counts at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const today = todayISO();
  const employees = useEmployees();
  const todayRows = useAttendanceRange(today, today);

  const list = employees.data ?? [];
  const active = list.filter(
    (employee) =>
      employee.joining_date <= today &&
      (!employee.relieving_date || employee.relieving_date >= today),
  );
  const attendance = todayRows.data ?? [];
  const present = attendance.filter((row) => row.status === "present").length;
  const absent = attendance.filter((row) => row.status === "absent").length;

  return (
    <AppShell>
      <section className="panel p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-ink">Today’s attendance</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Attendance summary</h1>
        <p className="mt-1 text-sm text-muted-ink">
          {new Date(today + "T00:00:00").toLocaleDateString("en-IN", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </p>
      </section>

      <Link
        to="/attendance"
        className="panel group flex items-center justify-between gap-4 border-accent/40 bg-accent/5 p-3 transition hover:border-accent hover:bg-accent/10"
      >
        <div>
          <p className="text-sm font-semibold">Mark attendance</p>
          <p className="text-xs text-muted-ink">Quickly record today’s staff attendance</p>
        </div>
        <span className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition group-hover:scale-[1.02]">
          Open
        </span>
      </Link>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Present" value={present} tone="text-present" />
        <Stat label="Absent" value={absent} tone="text-absent" />
        <Stat label="Total employees" value={active.length} />
      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  tone = "text-ink",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-ink">{label}</p>
      <p className={`mt-1 font-display text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}
