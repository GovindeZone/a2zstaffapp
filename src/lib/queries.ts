import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type {
  AttendanceRow,
  AttendanceStatus,
  DocumentKind,
  Employee,
  EmployeeDocument,
} from "@/lib/hr";

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
  });
}

export function useAttendanceRange(from: string, to: string) {
  return useQuery({
    queryKey: ["attendance", from, to],
    queryFn: async (): Promise<AttendanceRow[]> => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, employee_id, attendance_date, status")
        .gte("attendance_date", from)
        .lte("attendance_date", to);
      if (error) throw error;
      return (data ?? []) as AttendanceRow[];
    },
  });
}

export function useSaveEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<Employee> & { id?: string }) => {
      const { id, ...values } = payload;
      if (id) {
        const { error } = await supabase.from("employees").update(values).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("employees")
        .insert(values as never)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useMarkAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      attendance_date: string;
      status: AttendanceStatus;
    }) => {
      const { error } = await supabase
        .from("attendance")
        .upsert(input as never, { onConflict: "employee_id,attendance_date" });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["attendance"] }),
  });
}

export function useEmployeeDocuments(employeeId: string | null) {
  return useQuery({
    queryKey: ["documents", employeeId],
    enabled: Boolean(employeeId),
    queryFn: async (): Promise<EmployeeDocument[]> => {
      const { data, error } = await supabase
        .from("employee_documents")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EmployeeDocument[];
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      employeeId: string;
      kind: DocumentKind;
      label: string;
      file: File;
    }) => {
      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${input.employeeId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("employee-documents")
        .upload(path, input.file, { upsert: false });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("employee_documents").insert({
        employee_id: input.employeeId,
        kind: input.kind,
        label: input.label || input.file.name,
        file_path: path,
        file_name: input.file.name,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_data, variables) =>
      queryClient.invalidateQueries({ queryKey: ["documents", variables.employeeId] }),
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (doc: EmployeeDocument) => {
      await supabase.storage.from("employee-documents").remove([doc.file_path]);
      const { error } = await supabase.from("employee_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: (_data, doc) =>
      queryClient.invalidateQueries({ queryKey: ["documents", doc.employee_id] }),
  });
}

export async function openDocument(filePath: string) {
  const { data, error } = await supabase.storage
    .from("employee-documents")
    .createSignedUrl(filePath, 300);
  if (error) throw error;
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}
