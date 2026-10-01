-- Seed Industry Standard Department-Isolated Users for Acme Corporation
-- Password for all seed users: demo-password

INSERT INTO users (id, tenant_id, email, display_name, password_hash, role, approval_status, approved_at) VALUES
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'ops@acme.demo', 'David Chen (Operations)', crypt('demo-password', gen_salt('bf')), 'member', 'approved', now()),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'finance@acme.demo', 'Sarah Lin (Finance)', crypt('demo-password', gen_salt('bf')), 'member', 'approved', now()),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'legal@acme.demo', 'Elena Rostova (Legal)', crypt('demo-password', gen_salt('bf')), 'department_admin', 'approved', now()),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 'auditor@acme.demo', 'Marcus Vance (Auditor)', crypt('demo-password', gen_salt('bf')), 'auditor', 'approved', now())
ON CONFLICT (tenant_id, email) DO UPDATE 
SET display_name = EXCLUDED.display_name,
    role = EXCLUDED.role,
    approval_status = 'approved',
    password_hash = crypt('demo-password', gen_salt('bf'));

-- Assign Isolated Department Memberships
-- Operations User -> Operations ONLY
INSERT INTO department_memberships (user_id, department_id) VALUES
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000011')
ON CONFLICT DO NOTHING;

-- Finance User -> Finance ONLY
INSERT INTO department_memberships (user_id, department_id) VALUES
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000013')
ON CONFLICT DO NOTHING;

-- Legal Counsel -> Legal ONLY
INSERT INTO department_memberships (user_id, department_id) VALUES
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000012')
ON CONFLICT DO NOTHING;

-- Compliance Auditor -> Finance & Legal
INSERT INTO department_memberships (user_id, department_id) VALUES
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000013'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000012')
ON CONFLICT DO NOTHING;
