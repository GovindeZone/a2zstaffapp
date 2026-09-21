import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { DocumentsPanel } from "@/components/DocumentsPanel";
import { EmployeeForm } from "@/components/EmployeeForm";
import { exportToExcel, exportToPdf } from "@/lib/exporters";
import { formatDate, type Employee } from "@/lib/hr";
import { useDeleteEmployee, useEmployees } from "@/lib/queries";

export const Route = createFileRoute("/employees")({
  head: () => ({
    meta: [
      { title: "Staff — A to Z HR Register" },
      { name: "description", content: "Staff records for A to Z." },
      { property: "og:title", content: "Staff — A to Z HR Register" },
      { property: "og:description", content: "Add, edit and manage staff records." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StaffPage,
});

const HEADERS = ["Full name", "Phone", "Department", "Joining date", "Relieving date", "Aadhaar", "Address", "Emergency contact", "Emergency number", "Reference name", "Reference relationship", "Reference phone"];

function StaffPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [docsFor, setDocsFor] = useState<Employee | null>(null);
  const employees = useEmployees();
  const remove = useDeleteEmployee();

  const departments = useMemo(() => [...new Set((employees.data ?? []).map((e) => e.department).filter(Boolean))].sort(), [employees.data]);
  const visible = (employees.data ?? []).filter((employee) => {
    const term = search.trim().toLowerCase();
    const matches = !term || [employee.full_name, employee.phone, employee.department, employee.aadhaar_number].join(" ").toLowerCase().includes(term);
    const inDept = department === "all" || employee.department === department;
    const inStatus = status === "all" || (status === "active" ? !employee.relieving_date : Boolean(employee.relieving_date));
    return matches && inDept && inStatus;
  });
  const rows = visible.map((employee) => [employee.full_name, employee.phone, employee.department, formatDate(employee.joining_date), formatDate(employee.relieving_date), employee.aadhaar_number, employee.address, employee.emergency_contact_name, employee.emergency_contact_number, employee.reference_name, employee.reference_relationship, employee.reference_phone]);
  const onDelete = (employee: Employee) => {
    if (!window.confirm(`Remove ${employee.full_name} and all their attendance records?`)) return;
    remove.mutate(employee.id, { onSuccess: () => toast.success(`${employee.full_name} removed.`), onError: (error) => toast.error((error as Error).message) });
  };

  return <AppShell>
    <section className="rise panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="font-display text-2xl font-bold tracking-tight">Staff</h1><p className="mt-1 text-sm text-muted-ink">{visible.length} of {(employees.data ?? []).length} records shown.</p></div><button className="btn-accent" onClick={() => { setEditing(null); setShowForm(true); }}>Add staff</button></div>
      <div className="mt-4 grid gap-3 md:grid-cols-4"><label className="block md:col-span-2"><span className="field-label">Search</span><input className="field" placeholder="Name, phone, department or Aadhaar" value={search} onChange={(event) => setSearch(event.target.value)} /></label><label className="block"><span className="field-label">Department</span><select className="field" value={department} onChange={(event) => setDepartment(event.target.value)}><option value="all">All departments</option>{departments.map((dept) => <option key={dept} value={dept}>{dept}</option>)}</select></label><label className="block"><span className="field-label">Status</span><select className="field" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All</option><option value="active">Active</option><option value="relieved">Relieved</option></select></label></div>
      <div className="mt-3 flex flex-wrap gap-2"><button className="btn-quiet text-xs" onClick={() => exportToExcel("staff", "Staff", HEADERS, rows)}>Export Excel</button><button className="btn-quiet text-xs" onClick={() => exportToPdf("staff", "Staff details", `${visible.length} records`, HEADERS, rows)}>Export PDF</button></div>
    </section>
    {employees.isLoading ? <p className="py-16 text-center text-sm text-muted-ink">Loading staff…</p> : visible.length === 0 ? <p className="panel p-8 text-center text-sm text-muted-ink">No staff yet. Use “Add staff” to create the first record.</p> : <div className="panel overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-line text-xs text-muted-ink"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Department</th><th className="px-4 py-3">Joining date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr></thead><tbody className="divide-y divide-line">{visible.map((employee) => <tr key={employee.id}><td className="px-4 py-3 font-medium">{employee.full_name}</td><td className="px-4 py-3">{employee.phone}</td><td className="px-4 py-3">{employee.department || "—"}</td><td className="px-4 py-3">{formatDate(employee.joining_date)}</td><td className="px-4 py-3">{employee.relieving_date ? "Relieved" : "Active"}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-2"><button className="btn-quiet text-xs" onClick={() => { setEditing(employee); setShowForm(true); }}>Edit</button><button className="btn-quiet text-xs" onClick={() => setDocsFor(employee)}>Documents</button><button className="btn-quiet text-xs text-destructive" onClick={() => onDelete(employee)}>Delete</button></div></td></tr>)}</tbody></table></div>}
    {showForm ? <EmployeeForm employee={editing} onClose={() => setShowForm(false)} /> : null}{docsFor ? <DocumentsPanel employee={docsFor} onClose={() => setDocsFor(null)} /> : null}
  </AppShell>;
}
