ALTER TABLE departments ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved' CHECK(approval_status IN ('pending','approved','rejected'));
ALTER TABLE departments ADD COLUMN IF NOT EXISTS requested_by uuid REFERENCES users(id);
ALTER TABLE departments ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
