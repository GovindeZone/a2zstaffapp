import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { exportToExcel, exportToPdf } from "@/lib/exporters";
import { useRecruitmentCandidates, useSaveCandidate, type RecruitmentCandidate } from "@/lib/queries";

export const Route = createFileRoute("/recruitment")({
  head: () => ({
    meta: [
      { title: "Recruitment — A to Z HR Register" },
      { name: "description", content: "Candidate enquiries, follow-ups and recruitment reports." },
    ],
  }),
  component: RecruitmentPage,
});

const JOB_TYPES = ["Full time", "Part time"] as const;
const STATUSES = [
  "Interested",
  "Not Interested",
  "Busy/Unreachable",
  "Interviewed",
  "Interviewed - Not Joined",
  "Joined/Hired",
] as const;
const HEADERS = ["Candidate Name", "Phone Number", "Enquiry Date", "Job Type", "Enquiry Status", "Enquiry Remarks"];

type StatusFilter = "all" | "follow_up" | (typeof STATUSES)[number];

function RecruitmentPage() {
  const candidates = useRecruitmentCandidates();
  const save = useSaveCandidate();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("follow_up");
  const [reportStatus, setReportStatus] = useState<(typeof STATUSES)[number] | "all">("all");
  const [form, setForm] = useState({
    candidate_name: "",
    phone_number: "",
    enquiry_date: new Date().toISOString().slice(0, 10),
    job_type: "Full time" as (typeof JOB_TYPES)[number],
    enquiry_status: "Interested" as (typeof STATUSES)[number],
    enquiry_remarks: "",
  });

  const visible = useMemo(() => {
    const rows = candidates.data ?? [];
    if (filter === "all") return rows;
    if (filter === "follow_up") {
      return rows.filter(
        (row) => !["Not Interested", "Interviewed - Not Joined", "Joined/Hired"].includes(row.enquiry_status),
      );
    }
    return rows.filter((row) => row.enquiry_status === filter);
  }, [candidates.data, filter]);

  const reportRows = useMemo(() => {
    const rows = candidates.data ?? [];
    return (reportStatus === "all" ? rows : rows.filter((row) => row.enquiry_status === reportStatus)).map((row) => [
      row.candidate_name,
      row.phone_number,
      row.enquiry_date,
      row.job_type,
      row.enquiry_status,
      row.enquiry_remarks,
    ]);
  }, [candidates.data, reportStatus]);

  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{10}$/.test(form.phone_number)) {
      toast.error("Phone number must be exactly 10 digits.");
      return;
    }
    save.mutate(form, {
      onSuccess: () => {
        toast.success("Candidate enquiry saved.");
        setShowForm(false);
        setForm({
          candidate_name: "",
          phone_number: "",
          enquiry_date: new Date().toISOString().slice(0, 10),
          job_type: "Full time",
          enquiry_status: "Interested",
          enquiry_remarks: "",
        });
      },
      onError: (error) => toast.error((error as Error).message),
    });
  };

  return (
    <AppShell>
      <section className="rise panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-ink">HR</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">Recruitment</h1>
            <p className="mt-1 text-sm text-muted-ink">Capture candidate enquiries, manage follow-ups and generate recruitment reports.</p>
          </div>
          <button className="btn-accent" onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Close" : "Add Candidate"}
          </button>
        </div>

        {showForm ? (
          <form onSubmit={submit} className="mt-5 rounded-xl border border-line p-4">
            <h2 className="font-display text-lg font-semibold">Add Candidate</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              <Field label="Candidate Name" required>
                <input className="field" required maxLength={100} value={form.candidate_name} onChange={(e) => update("candidate_name", e.target.value)} />
              </Field>
              <Field label="Phone Number" required>
                <input className="field" required inputMode="numeric" pattern="[0-9]{10}" maxLength={10} minLength={10} value={form.phone_number} onChange={(e) => update("phone_number", e.target.value.replace(/\D/g, "").slice(0, 10))} />
              </Field>
              <Field label="Enquiry Date" required>
                <input className="field" required type="date" value={form.enquiry_date} onChange={(e) => update("enquiry_date", e.target.value)} />
              </Field>
              <Field label="Job Type" required>
                <select className="field" required value={form.job_type} onChange={(e) => update("job_type", e.target.value)}>{JOB_TYPES.map((item) => <option key={item}>{item}</option>)}</select>
              </Field>
              <Field label="Enquiry Status" required>
                <select className="field" required value={form.enquiry_status} onChange={(e) => update("enquiry_status", e.target.value)}>{STATUSES.map((item) => <option key={item}>{item}</option>)}</select>
              </Field>
              <Field label="Enquiry Remarks" required>
                <textarea className="field min-h-24" required maxLength={1000} value={form.enquiry_remarks} onChange={(e) => update("enquiry_remarks", e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <button className="btn-accent" type="submit" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Candidate Enquiries</h2>
            <p className="mt-1 text-xs text-muted-ink">{visible.length} candidate{visible.length === 1 ? "" : "s"} shown.</p>
          </div>
          <label className="block min-w-56">
            <span className="field-label">Follow-up filter</span>
            <select className="field" value={filter} onChange={(e) => setFilter(e.target.value as StatusFilter)}>
              <option value="follow_up">Follow Up</option>
              <option value="all">All Candidates</option>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b border-line text-left text-xs text-muted-ink">{HEADERS.map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">
              {visible.map((row) => <CandidateRow key={row.id} row={row} />)}
              {!candidates.isLoading && visible.length === 0 ? <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-muted-ink">No candidates match this filter.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Recruitment Reports</h2>
          <p className="mt-1 text-xs text-muted-ink">Select an enquiry status, view the matching candidates, or export the report.</p>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-64"><span className="field-label">Report Status</span><select className="field" value={reportStatus} onChange={(e) => setReportStatus(e.target.value as typeof reportStatus)}><option value="all">All Statuses</option>{STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
          <button className="btn-quiet" onClick={() => exportToExcel("recruitment-report", "Recruitment", HEADERS, reportRows)}>Export Excel</button>
          <button className="btn-quiet" onClick={() => exportToPdf("recruitment-report", "Recruitment report", reportStatus === "all" ? "All enquiry statuses" : reportStatus, HEADERS, reportRows)}>Export PDF</button>
        </div>
        <p className="mt-3 text-xs text-muted-ink">{reportRows.length} matching candidate{reportRows.length === 1 ? "" : "s"}.</p>
      </section>
    </AppShell>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="block"><span className="field-label">{label}{required ? " *" : ""}</span>{children}</label>;
}

function CandidateRow({ row }: { row: RecruitmentCandidate }) {
  return <tr className="align-top"><td className="px-3 py-3 font-medium">{row.candidate_name}</td><td className="px-3 py-3 font-mono">{row.phone_number}</td><td className="px-3 py-3">{row.enquiry_date}</td><td className="px-3 py-3">{row.job_type}</td><td className="px-3 py-3">{row.enquiry_status}</td><td className="max-w-80 px-3 py-3 text-muted-ink">{row.enquiry_remarks}</td></tr>;
}
