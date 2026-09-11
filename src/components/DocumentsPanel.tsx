import { useState } from "react";
import { toast } from "sonner";

import type { DocumentKind, Employee, EmployeeDocument } from "@/lib/hr";
import {
  openDocument,
  useDeleteDocument,
  useEmployeeDocuments,
  useUploadDocument,
} from "@/lib/queries";

const KINDS: { value: DocumentKind; label: string }[] = [
  { value: "aadhaar", label: "Aadhaar" },
  { value: "resume", label: "Resume" },
  { value: "other", label: "Other document" },
];

export function DocumentsPanel({
  employee,
  onClose,
}: {
  employee: Employee;
  onClose: () => void;
}) {
  const documents = useEmployeeDocuments(employee.id);
  const upload = useUploadDocument();
  const remove = useDeleteDocument();

  const [kind, setKind] = useState<DocumentKind>("aadhaar");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      toast.error("Choose a file first.");
      return;
    }
    upload.mutate(
      { employeeId: employee.id, kind, label, file },
      {
        onSuccess: () => {
          toast.success("Document uploaded.");
          setFile(null);
          setLabel("");
        },
        onError: (error) => toast.error((error as Error).message),
      },
    );
  };

  const onRemove = (doc: EmployeeDocument) => {
    if (!window.confirm(`Delete ${doc.label}?`)) return;
    remove.mutate(doc, {
      onSuccess: () => toast.success("Document deleted."),
      onError: (error) => toast.error((error as Error).message),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6">
      <div className="sheet panel max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">Documents</h2>
            <p className="text-xs text-muted-ink">{employee.full_name}</p>
          </div>
          <button className="btn-quiet text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="field-label">Type</span>
            <select
              className="field"
              value={kind}
              onChange={(event) => setKind(event.target.value as DocumentKind)}
            >
              {KINDS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Label</span>
            <input
              className="field"
              placeholder="Warning letter, certificate…"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="field-label">File</span>
            <input
              type="file"
              className="field"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-accent" disabled={upload.isPending}>
              {upload.isPending ? "Uploading…" : "Upload document"}
            </button>
          </div>
        </form>

        <div className="mt-5 divide-y divide-line border-t border-line">
          {documents.isLoading ? (
            <p className="py-6 text-center text-sm text-muted-ink">Loading documents…</p>
          ) : (documents.data ?? []).length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-ink">
              No documents on file yet.
            </p>
          ) : (
            (documents.data ?? []).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.label}</p>
                  <p className="truncate text-xs text-muted-ink">
                    {KINDS.find((k) => k.value === doc.kind)?.label} · {doc.file_name}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    className="btn-quiet text-xs"
                    onClick={() =>
                      openDocument(doc.file_path).catch((error) =>
                        toast.error((error as Error).message),
                      )
                    }
                  >
                    View
                  </button>
                  <button
                    className="btn-quiet text-xs text-destructive"
                    onClick={() => onRemove(doc)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
