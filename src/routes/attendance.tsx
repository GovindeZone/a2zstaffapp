import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import {
  ATTENDANCE_OPTIONS,
  STATUS_TONE,
  todayISO,
  type AttendanceStatus,
} from "@/lib/hr";
import { useAttendanceRange, useEmployees, useMarkAttendance } from "@/lib/queries";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Daily Attendance — A to Z HR Register" },
      {
        name: "description",
        content:
          "Mark present, absent, half day or weekly off for every A to Z employee, one date at a time.",
      },
      { property: "og:title", content: "Daily Attendance — A to Z HR Register" },
      {
        property: "og:description",
        content: "Mark present, absent, half day or weekly off for each employee.",
      },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const [date, setDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");

  const employees = useEmployees();
  const rows = useAttendanceRange(date, date);
  const mark = useMarkAttendance();

  const departments = useMemo(
    () => [...new Set((employees.data ?? []).map((e) => e.department).filter(Boolean))].sort(),
    [employees.data],
  );

  const statusFor = new Map(
    (rows.data ?? []).map((row) => [row.employee_id, row.status as AttendanceStatus]),
  );

  const visible = (employees.data ?? []).filter((employee) => {
    const term = search.trim().toLowerCase();
    const matches =
      !term ||
      employee.full_name.toLowerCase().includes(term) ||
      employee.phone.includes(term) ||
      employee.department.toLowerCase().includes(term);
    const inDept = department === "all" || employee.department === department;
    return matches && inDept;
  });

  const setStatus = (employeeId: string, status: AttendanceStatus) => {
    mark.mutate(
      { employee_id: employeeId, attendance_date: date, status },
      {
        onError: (error) => toast.error((error as Error).message),
      },
    );
  };

  const markAllRemaining = (status: AttendanceStatus) => {
    const pending = visible.filter((employee) => !statusFor.has(employee.id));
    if (!pending.length) {
      toast.info("Everyone in this list is already marked.");
      return;
    }
    pending.forEach((employee) => setStatus(employee.id, status));
    toast.success(`Marked ${pending.length} unmarked ${pending.length === 1 ? "entry" : "entries"}.`);
  };

  return (
    <AppShell>
      <section className="rise panel p-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Daily attendance</h1>
        <p className="mt-1 text-sm text-muted-ink">
          {statusFor.size} of {(employees.data ?? []).length} employees marked on this date.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="field-label">Date</span>
            <input
              type="date"
              className="field"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="field-label">Search</span>
            <input
              className="field"
              placeholder="Name, phone or department"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">Department</span>
            <select
              className="field"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            >
              <option value="all">All departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-quiet text-xs" onClick={() => markAllRemaining("present")}>
            Mark remaining present
          </button>
          <button className="btn-quiet text-xs" onClick={() => markAllRemaining("weekly_off")}>
            Mark remaining weekly off
          </button>
        </div>
      </section>

      <section className="panel divide-y divide-line">
        {employees.isLoading ? (
          <p className="p-6 text-center text-sm text-muted-ink">Loading register…</p>
        ) : visible.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-ink">
            No employees match this filter. Add employees first.
          </p>
        ) : (
          visible.map((employee) => {
            const current = statusFor.get(employee.id);
            return (
              <div
                key={employee.id}
                className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{employee.full_name}</p>
                  <p className="text-xs text-muted-ink">
                    {employee.department} · {employee.phone}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ATTENDANCE_OPTIONS.map((option) => {
                    const isActive = current === option.value;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setStatus(employee.id, option.value)}
                        title={option.label}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                          isActive
                            ? `border-transparent ${STATUS_TONE[option.value]}`
                            : "border-line text-muted-ink hover:text-ink"
                        }`}
                      >
                        {option.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>
    </AppShell>
  );
}
