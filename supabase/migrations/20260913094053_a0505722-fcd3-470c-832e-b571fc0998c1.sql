ALTER TABLE public.employees
  ADD COLUMN reference_relationship text NOT NULL DEFAULT 'Not specified';

ALTER TABLE public.employees
  ALTER COLUMN reference_relationship DROP DEFAULT;

ALTER TABLE public.employees
  ADD CONSTRAINT employees_phone_10_digits CHECK (phone ~ '^[0-9]{10}$') NOT VALID,
  ADD CONSTRAINT employees_emergency_contact_10_digits CHECK (emergency_contact_number ~ '^[0-9]{10}$') NOT VALID,
  ADD CONSTRAINT employees_reference_phone_10_digits CHECK (reference_phone ~ '^[0-9]{10}$') NOT VALID,
  ADD CONSTRAINT employees_aadhaar_12_digits CHECK (aadhaar_number ~ '^[0-9]{12}$') NOT VALID,
  ADD CONSTRAINT employees_reference_relationship_required CHECK (btrim(reference_relationship) <> '');