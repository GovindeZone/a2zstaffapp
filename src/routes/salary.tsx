import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { exportToExcel, exportToPdf } from "@/lib/exporters";
import {
  buildSalaryLines,
  formatDate,
  formatMoney,
  monthStartISO,
  todayISO,
} from "@/lib/hr";
import { useAttendanceRange, useEmployees } from "@/lib/queries";

export const Route = createFileRoute("/salary")({
  head: () => ({
    meta: [
      { title: "Salary Report — A to Z HR Register" },
      {
        name: "description",
        content:
          "Salary computed from attendance for any period, department or employee, with Excel and PDF export.",
      },
      { property: "og:title", content: "Salary Report — A to Z HR Register" },
      {
        property: "og:description",
        content: "Attendance-based salary for any period, department or employee.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SalaryPage,
});

const HEADERS = [
  "Employee",
  "Department",
  "Present",
  "Half days",
  "Absent",
  "Weekly off",
  "Payable days",
  "Per day",
  "Earned",
  "Bonus",
  "Net payable",
];

function SalaryPage() {
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [department, setDepartment] = useState("all");
  const [employeeId, setEmployeeId] = useState("all");

  const employees = useEmployees();
  const attendance = useAttendanceRange(from, to);
  const invalidPeriod = Boolean(from && to && from > to);

  const departments = useMemo(
    () => [...new Set((employees.data ?? []).map((e) => e.department).filter(Boolean))].sort(),
    [employees.data],
  );

  const selected = (employees.data ?? []).filter((employee) => {
    if (employeeId !== "all") return employee.id === employeeId;
    return department === "all" || employee.department === department;
  });

  const lines = buildSalaryLines(selected, attendance.data ?? []);
  const totalNet = lines.reduce((sum, line) => sum + line.net, 0);
  const totalEarned = lines.reduce((sum, line) => sum + line.earned, 0);
  const totalBonus = lines.reduce((sum, line) => sum + line.bonus, 0);

  const rows = lines.map((line) => [
    line.employee.full_name,
    line.employee.department,
    line.present,
    line.halfDays,
    line.absent,
    line.weeklyOff,
    line.payableDays,
    Math.round(line.perDayRate),
    Math.round(line.earned),
    Math.round(line.bonus),
    Math.round(line.net),
  ]);

  const scope =
    employeeId !== "all"
      ? (employees.data ?? []).find((e) => e.id === employeeId)?.full_name ?? "Employee"
      : department !== "all"
        ? department
        : "All employees";
  const subtitle = `${scope} · ${formatDate(from)} to ${formatDate(to)}`;

  return (
    <AppShell>
      <section className="rise panel p-5">
        <h1 className="font-display text-2xl font-bold tracking-tight">Salary report</h1>
        <p className="mt-1 text-sm text-muted-ink">
          Pay is calculated from marked attendance: monthly salary ÷ 30 days, full pay for present
          and weekly off, half pay for half days, plus bonus.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="field-label">From date</span>
            <input
              type="date"
              className="field"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">To date</span>
            <input
              type="date"
              className="field"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">Department</span>
            <select
              className="field"
              value={department}
              onChange={(event) => {
                setDepartment(event.target.value);
                setEmployeeId("all");
              }}
            >
              <option value="all">All departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Employee</span>
            <select
              className="field"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
            >
              <option value="all">All employees</option>
              {(employees.data ?? [])
                .filter((e) => department === "all" || e.department === department)
                .map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="btn-quiet text-xs"
            onClick={() => exportToExcel("salary-report", "Salary", HEADERS, rows)}
          >
            Export Excel
          </button>
          <button
            className="btn-quiet text-xs"
            onClick={() => exportToPdf("salary-report", "Salary report", subtitle, HEADERS, rows)}
          >
            Export PDF
          </button>
        </div>
        {invalidPeriod ? (
          <p className="mt-3 text-sm text-destructive">The from date must be before the to date.</p>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Earned" value={formatMoney(totalEarned)} />
        <Stat label="Bonus" value={formatMoney(totalBonus)} />
        <Stat label="Net payable" value={formatMoney(totalNet)} />
      </div>

      <section className="panel overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted-ink">
              <th className="px-4 py-3">Employee</th>
              <th className="px-3 py-3">Dept</th>
              <th className="px-3 py-3 text-right">P</th>
              <th className="px-3 py-3 text-right">½</th>
              <th className="px-3 py-3 text-right">A</th>
              <th className="px-3 py-3 text-right">WO</th>
              <th className="px-3 py-3 text-right">Payable days</th>
              <th className="px-3 py-3 text-right">Per day</th>
              <th className="px-3 py-3 text-right">Earned</th>
              <th className="px-3 py-3 text-right">Bonus</th>
              <th className="px-4 py-3 text-right">Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line font-mono tabular-nums">
            {lines.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center font-body text-muted-ink">
                  No employees for this selection.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.employee.id}>
                  <td className="px-4 py-3 font-body font-medium">{line.employee.full_name}</td>
                  <td className="px-3 py-3 font-body text-muted-ink">
                    {line.employee.department}
                  </td>
                  <td className="px-3 py-3 text-right">{line.present}</td>
                  <td className="px-3 py-3 text-right">{line.halfDays}</td>
                  <td className="px-3 py-3 text-right">{line.absent}</td>
                  <td className="px-3 py-3 text-right">{line.weeklyOff}</td>
                  <td className="px-3 py-3 text-right">{line.payableDays}</td>
                  <td className="px-3 py-3 text-right">{formatMoney(line.perDayRate)}</td>
                  <td className="px-3 py-3 text-right">{formatMoney(line.earned)}</td>
                  <td className="px-3 py-3 text-right">{formatMoney(line.bonus)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(line.net)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
