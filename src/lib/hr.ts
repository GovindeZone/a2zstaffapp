export type AttendanceStatus =
  "present" | "absent" | "half_day_morning" | "half_day_afternoon" | "weekly_off";

export type DocumentKind = "aadhaar" | "resume" | "other";

export interface Employee {
  id: string;
  full_name: string;
  phone: string;
  department: string;
  joining_date: string;
  relieving_date: string | null;
  monthly_salary: number;
  bonus: number;
  aadhaar_number: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_number: string;
  reference_name: string;
  reference_relationship: string;
  reference_phone: string;
  created_at?: string;
}

export interface AttendanceRow {
  id: string;
  employee_id: string;
  attendance_date: string;
  status: AttendanceStatus;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  kind: DocumentKind;
  label: string;
  file_path: string;
  file_name: string;
  created_at: string;
}

export const ATTENDANCE_OPTIONS: { value: AttendanceStatus; label: string; short: string }[] = [
  { value: "present", label: "Present", short: "P" },
  { value: "absent", label: "Absent", short: "A" },
  { value: "half_day_morning", label: "Half Day (Morning Absent)", short: "½ AM" },
  { value: "half_day_afternoon", label: "Half Day (Afternoon Absent)", short: "½ PM" },
  { value: "weekly_off", label: "Weekly Off", short: "WO" },
];

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  absent: "Absent",
  half_day_morning: "Half Day (Morning Absent)",
  half_day_afternoon: "Half Day (Afternoon Absent)",
  weekly_off: "Weekly Off",
};

/** Text colour class per status, using design tokens only. */
export const STATUS_TONE: Record<AttendanceStatus, string> = {
  present: "text-present bg-present/10",
  absent: "text-absent bg-absent/10",
  half_day_morning: "text-half bg-half/10",
  half_day_afternoon: "text-half bg-half/10",
  weekly_off: "text-off bg-off/10",
};

export const STATUS_DOT: Record<AttendanceStatus, string> = {
  present: "bg-present",
  absent: "bg-absent",
  half_day_morning: "bg-half",
  half_day_afternoon: "bg-half",
  weekly_off: "bg-off",
};

/** Payable weight of one marked day. */
export function dayWeight(status: AttendanceStatus): number {
  switch (status) {
    case "present":
    case "weekly_off":
      return 1;
    case "half_day_morning":
    case "half_day_afternoon":
      return 0.5;
    case "absent":
      return 0;
  }
}

export const STANDARD_MONTH_DAYS = 30;

export interface SalaryLine {
  employee: Employee;
  present: number;
  halfDays: number;
  absent: number;
  weeklyOff: number;
  markedDays: number;
  payableDays: number;
  perDayRate: number;
  earned: number;
  bonus: number;
  net: number;
}

export function buildSalaryLines(employees: Employee[], attendance: AttendanceRow[]): SalaryLine[] {
  const byEmployee = new Map<string, AttendanceRow[]>();
  for (const row of attendance) {
    const list = byEmployee.get(row.employee_id) ?? [];
    list.push(row);
    byEmployee.set(row.employee_id, list);
  }

  return employees.map((employee) => {
    const rows = byEmployee.get(employee.id) ?? [];
    let present = 0;
    let halfDays = 0;
    let absent = 0;
    let weeklyOff = 0;
    let payableDays = 0;

    for (const row of rows) {
      payableDays += dayWeight(row.status);
      if (row.status === "present") present += 1;
      else if (row.status === "absent") absent += 1;
      else if (row.status === "weekly_off") weeklyOff += 1;
      else halfDays += 1;
    }

    const monthly = Number(employee.monthly_salary) || 0;
    const bonus = Number(employee.bonus) || 0;
    const perDayRate = monthly / STANDARD_MONTH_DAYS;
    const earned = perDayRate * payableDays;

    return {
      employee,
      present,
      halfDays,
      absent,
      weeklyOff,
      markedDays: rows.length,
      payableDays,
      perDayRate,
      earned,
      bonus,
      net: earned + bonus,
    };
  });
}

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatMoney(value: number): string {
  return inr.format(Math.round(value || 0));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value + (value.length === 10 ? "T00:00:00" : ""));
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function monthStartISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}
