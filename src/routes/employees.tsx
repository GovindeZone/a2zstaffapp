import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { EmployeeForm } from "@/components/EmployeeForm";
import { exportToExcel, exportToPdf } from "@/lib/exporters";
import { formatDate, formatMoney, type Employee } from "@/lib/hr";
import { useDeleteEmployee, useEmployees } from "@/lib/queries";

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "Employees — A to Z HR Register" },
      {
        name: "description",
        content:
          "Employee records for A to Z, Navalur Junction: contact, salary, emergency and reference details plus Aadhaar and resume files.",
      },
      { property: "og:title", content: "Employees — A to Z HR Register" },
      {
        property: "og:description",
        content: "Add, edit and remove employees, and keep their documents on file.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EmployeesPage,
});

const HEADERS = [
  "Full name",
  "Phone",
  "Department",
  "Joining date",
  "Relieving date",
  "Monthly salary",
  "Bonus",
  "Aadhaar",
  "Address",
  "Emergency contact",
  "Emergency number",
  "Reference name",
  "Reference relationship",
  "Reference phone",
];

function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [docsFor, setDocsFor] = useState<Employee | null>(null);

  const employees = useEmployees();
  const remove = useDeleteEmployee();

  const departments = useMemo(
    () => [...new Set((employees.data ?? []).map((e) => e.department).filter(Boolean))].sort(),
    [employees.data],
  );

  const visible = (employees.data ?? []).filter((employee) => {
    const term = search.trim().toLowerCase();
    const matches =
      !term ||
      [employee.full_name, employee.phone, employee.department, employee.aadhaar_number]
        .join(" ")
        .toLowerCase()
        .includes(term);
    const inDept = department === "all" || employee.department === department;
    const inStatus =
      status === "all" ||
      (status === "active" ? !employee.relieving_date : Boolean(employee.relieving_date));
    return matches && inDept && inStatus;
  });

  const rows = visible.map((employee) => [
    employee.full_name,
    employee.phone,
    employee.department,
    formatDate(employee.joining_date),
    formatDate(employee.relieving_date),
    Number(employee.monthly_salary),
    Number(employee.bonus),
    employee.aadhaar_number,
    employee.address,
    employee.emergency_contact_name,
    employee.emergency_contact_number,
    employee.reference_name,
    employee.reference_relationship,
    employee.reference_phone,
  ]);

  const onDelete = (employee: Employee) => {
    if (!window.confirm(`Remove ${employee.full_name} and all their attendance records?`)) return;
    remove.mutate(employee.id, {
      onSuccess: () => toast.success(`${employee.full_name} removed.`),
      onError: (error) => toast.error((error as Error).message),
    });
  };

  return (
    <AppShell>
      <section className="rise panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Employees</h1>
            <p className="mt-1 text-sm text-muted-ink">
              {visible.length} of {(employees.data ?? []).length} records shown.
            </p>
          </div>
          <button
            className="btn-accent"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            Add employee
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="block md:col-span-2">
            <span className="field-label">Search</span>
            <input
              className="field"
              placeholder="Name, phone, department or Aadhaar"
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
          <label className="block">
            <span className="field-label">Status</span>
            <select
              className="field"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="relieved">Relieved</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="btn-quiet text-xs"
            onClick={() => exportToExcel("employees", "Employees", HEADERS, rows)}
          >
            Export Excel
          </button>
          <button
            className="btn-quiet text-xs"
            onClick={() =>
              exportToPdf(
                "employees",
                "Employee details",
                `${visible.length} records`,
                HEADERS,
                rows,
              )
            }
          >
            Export PDF
          </button>
        </div>
      </section>

      {employees.isLoading ? (
        <p className="py-16 text-center text-sm text-muted-ink">Loading employees…</p>
      ) : visible.length === 0 ? (
        <p className="panel p-8 text-center text-sm text-muted-ink">
          No employees yet. Use “Add employee” to create the first record.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((employee) => (
            <article key={employee.id} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">{employee.full_name}</h2>
                  <p className="text-xs text-muted-ink">
                    {employee.department} · {employee.phone}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                    employee.relieving_date ? "bg-off/10 text-off" : "bg-present/10 text-present"
                  }`}
                >
                  {employee.relieving_date ? "Relieved" : "Active"}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <Row label="Joined" value={formatDate(employee.joining_date)} />
                <Row label="Relieved" value={formatDate(employee.relieving_date)} />
                <Row label="Monthly salary" value={formatMoney(Number(employee.monthly_salary))} />
                <Row label="Bonus" value={formatMoney(Number(employee.bonus))} />
                <Row label="Aadhaar" value={employee.aadhaar_number} />
                <Row
                  label="Emergency"
                  value={`${employee.emergency_contact_name} · ${employee.emergency_contact_number}`}
                />
                <Row
                  label="Reference"
                  value={`${employee.reference_name} · ${employee.reference_relationship} · ${employee.reference_phone}`}
                />
                <Row label="Address" value={employee.address} />
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  className="btn-quiet text-xs"
                  onClick={() => {
                    setEditing(employee);
                    setShowForm(true);
                  }}
                >
                  Edit
                </button>
                <button className="btn-quiet text-xs" onClick={() => setDocsFor(employee)}>
                  Documents
                </button>
                <button
                  className="btn-quiet text-xs text-destructive"
                  onClick={() => onDelete(employee)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm ? <EmployeeForm employee={editing} onClose={() => setShowForm(false)} /> : null}
      {docsFor ? <DocumentsPanel employee={docsFor} onClose={() => setDocsFor(null)} /> : null}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted-ink">{label}</dt>
      <dd className="mt-0.5 break-words">{value || "—"}</dd>
    </div>
  );
}
