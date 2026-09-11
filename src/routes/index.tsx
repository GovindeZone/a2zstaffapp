import { createFileRoute, Link } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import {
  ATTENDANCE_OPTIONS,
  STATUS_DOT,
  buildSalaryLines,
  formatMoney,
  monthStartISO,
  todayISO,
  type AttendanceStatus,
} from "@/lib/hr";
import { useAttendanceRange, useEmployees } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — A to Z HR Register" },
      {
        name: "description",
        content:
          "Daily attendance snapshot, active headcount and month-to-date payroll for A to Z, Navalur Junction, Chennai.",
      },
      { property: "og:title", content: "Dashboard — A to Z HR Register" },
      {
        property: "og:description",
        content: "Attendance snapshot, headcount and month-to-date payroll at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const today = todayISO();
  const employees = useEmployees();
  const todayRows = useAttendanceRange(today, today);
  const monthRows = useAttendanceRange(monthStartISO(), today);

  const list = employees.data ?? [];
  const active = list.filter((e) => !e.relieving_date);
  const counts = ATTENDANCE_OPTIONS.map((option) => ({
    ...option,
    count: (todayRows.data ?? []).filter((row) => row.status === option.value).length,
  }));
  const marked = (todayRows.data ?? []).length;
  const lines = buildSalaryLines(list, monthRows.data ?? []);
  const monthPayroll = lines.reduce((sum, line) => sum + line.net, 0);
  const departments = new Set(list.map((e) => e.department.trim()).filter(Boolean));

  return (
    <AppShell>
      <section className="rise panel p-5">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-ink">Today</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
          Attendance register
        </h1>
        <p className="mt-1 text-sm text-muted-ink">
          {marked} of {active.length} active employees marked for{" "}
          {new Date(today + "T00:00:00").toLocaleDateString("en-IN", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/attendance" className="btn-accent">
            Mark attendance
          </Link>
          <Link to="/employees" className="btn-quiet">
            Add employee
          </Link>
          <Link to="/salary" className="btn-quiet">
            Salary report
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active employees" value={String(active.length)} />
        <Stat label="Total on record" value={String(list.length)} />
        <Stat label="Departments" value={String(departments.size)} />
        <Stat label="Month-to-date payroll" value={formatMoney(monthPayroll)} />
      </div>

      <section className="panel p-5">
        <h2 className="font-display text-lg font-semibold">Today at a glance</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {counts.map((item) => (
            <div
              key={item.value}
              className="flex items-center justify-between rounded-xl border border-line px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-muted-ink">
                <span
                  className={`size-2 rounded-full ${STATUS_DOT[item.value as AttendanceStatus]}`}
                />
                {item.label}
              </span>
              <span className="font-mono text-base font-semibold tabular-nums">{item.count}</span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel p-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-ink">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}
