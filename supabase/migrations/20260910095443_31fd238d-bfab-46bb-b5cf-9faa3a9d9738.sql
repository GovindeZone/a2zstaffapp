CREATE TYPE public.attendance_status AS ENUM ('present','absent','half_day_morning','half_day_afternoon','weekly_off');
CREATE TYPE public.document_kind AS ENUM ('aadhaar','resume','other');

CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT NOT NULL,
  joining_date DATE NOT NULL,
  relieving_date DATE,
  monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  bonus NUMERIC(12,2) NOT NULL DEFAULT 0,
  aadhaar_number TEXT NOT NULL,
  address TEXT NOT NULL,
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_number TEXT NOT NULL,
  reference_name TEXT NOT NULL,
  reference_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in staff manage employees" ON public.employees FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status public.attendance_status NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (employee_id, attendance_date)
);
CREATE INDEX attendance_date_idx ON public.attendance (attendance_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in staff manage attendance" ON public.attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  kind public.document_kind NOT NULL DEFAULT 'other',
  label TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX employee_documents_employee_idx ON public.employee_documents (employee_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_documents TO authenticated;
GRANT ALL ON public.employee_documents TO service_role;
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in staff manage documents" ON public.employee_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER employees_touch BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER attendance_touch BEFORE UPDATE ON public.attendance FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "Staff read employee documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'employee-documents');
CREATE POLICY "Staff upload employee documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'employee-documents');
CREATE POLICY "Staff update employee documents" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'employee-documents');
CREATE POLICY "Staff delete employee documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'employee-documents');