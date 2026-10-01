INSERT INTO tenants (id, name, slug, approval_status, approved_at) VALUES ('00000000-0000-0000-0000-000000000001', 'Acme Corporation', 'acme', 'approved', now()) ON CONFLICT (slug) DO NOTHING;
INSERT INTO departments (id, tenant_id, name) VALUES
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Operations'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Legal'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Finance') ON CONFLICT DO NOTHING;
INSERT INTO users (id, tenant_id, email, display_name, password_hash, role, approval_status, approved_at) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'admin@acme.demo', 'Admin User', crypt('demo-password', gen_salt('bf')), 'tenant_admin', 'approved', now()) ON CONFLICT (tenant_id, email) DO NOTHING;
INSERT INTO department_memberships (user_id, department_id) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000013') ON CONFLICT DO NOTHING;
INSERT INTO platform_admins (email, password_hash, display_name) VALUES ('platform@raghub.demo', crypt('platform-password', gen_salt('bf')), 'Platform Approver') ON CONFLICT (email) DO NOTHING;
