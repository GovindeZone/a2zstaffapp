import { useState } from "react";
import { toast } from "sonner";

import type { Employee } from "@/lib/hr";
import { useSaveEmployee } from "@/lib/queries";

type FormState = Omit<Employee, "id" | "created_at">;

const EMPTY: FormState = {
  full_name: "",
  phone: "",
  department: "",
  joining_date: "",
  relieving_date: null,
  monthly_salary: 0,
  bonus: 0,
  aadhaar_number: "",
  address: "",
  emergency_contact_name: "",
  emergency_contact_number: "",
  reference_name: "",
  reference_phone: "",
};

export function EmployeeForm({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const save = useSaveEmployee();
  const [form, setForm] = useState<FormState>(() =>
    employee
      ? {
          full_name: employee.full_name,
          phone: employee.phone,
          department: employee.department,
          joining_date: employee.joining_date,
          relieving_date: employee.relieving_date,
          monthly_salary: Number(employee.monthly_salary),
          bonus: Number(employee.bonus),
          aadhaar_number: employee.aadhaar_number,
          address: employee.address,
          emergency_contact_name: employee.emergency_contact_name,
          emergency_contact_number: employee.emergency_contact_number,
          reference_name: employee.reference_name,
          reference_phone: employee.reference_phone,
        }
      : EMPTY,
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    save.mutate(
      {
        ...form,
        relieving_date: form.relieving_date ? form.relieving_date : null,
        monthly_salary: Number(form.monthly_salary) || 0,
        bonus: Number(form.bonus) || 0,
        ...(employee ? { id: employee.id } : {}),
      },
      {
        onSuccess: () => {
          toast.success(employee ? "Employee updated." : "Employee added.");
          onClose();
        },
        onError: (error) => toast.error((error as Error).message),
      },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6">
      <form
        onSubmit={submit}
        className="sheet panel max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-bold">
            {employee ? "Edit employee" : "Add employee"}
          </h2>
          <button type="button" className="btn-quiet text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Full name *">
            <input
              required
              inputMode="tel"
              pattern="[0-9+() -]{7,20}"
              title="Enter a valid phone number"
              className="field"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
            />
          </Field>
          <Field label="Phone number *">
            <input
              required
              inputMode="numeric"
              pattern="[0-9]{12}"
              maxLength={12}
              title="Enter the 12-digit Aadhaar number"
              className="field"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="Department *">
            <input
              required
              inputMode="tel"
              pattern="[0-9+() -]{7,20}"
              title="Enter a valid phone number"
              className="field"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
            />
          </Field>
          <Field label="Aadhaar number *">
            <input
              required
              inputMode="tel"
              pattern="[0-9+() -]{7,20}"
              title="Enter a valid phone number"
              className="field"
              value={form.aadhaar_number}
              onChange={(e) => set("aadhaar_number", e.target.value)}
            />
          </Field>
          <Field label="Joining date *">
            <input
              required
              type="date"
              className="field"
              value={form.joining_date}
              onChange={(e) => set("joining_date", e.target.value)}
            />
          </Field>
          <Field label="Relieving date">
            <input
              type="date"
              className="field"
              value={form.relieving_date ?? ""}
              onChange={(e) => set("relieving_date", e.target.value || null)}
            />
          </Field>
          <Field label="Monthly salary *">
            <input
              required
              type="number"
              min="0"
              step="1"
              className="field"
              value={form.monthly_salary}
              onChange={(e) => set("monthly_salary", Number(e.target.value))}
            />
          </Field>
          <Field label="Bonus">
            <input
              type="number"
              min="0"
              step="1"
              className="field"
              value={form.bonus}
              onChange={(e) => set("bonus", Number(e.target.value))}
            />
          </Field>
          <Field label="Address *" className="sm:col-span-2">
            <textarea
              required
              rows={2}
              className="field"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <Field label="Emergency contact name *">
            <input
              required
              className="field"
              value={form.emergency_contact_name}
              onChange={(e) => set("emergency_contact_name", e.target.value)}
            />
          </Field>
          <Field label="Emergency contact number *">
            <input
              required
              className="field"
              value={form.emergency_contact_number}
              onChange={(e) => set("emergency_contact_number", e.target.value)}
            />
          </Field>
          <Field label="Reference name *">
            <input
              required
              className="field"
              value={form.reference_name}
              onChange={(e) => set("reference_name", e.target.value)}
            />
          </Field>
          <Field label="Reference phone number *">
            <input
              required
              className="field"
              value={form.reference_phone}
              onChange={(e) => set("reference_phone", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-accent" disabled={save.isPending}>
            {save.isPending ? "Saving…" : employee ? "Save changes" : "Add employee"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
