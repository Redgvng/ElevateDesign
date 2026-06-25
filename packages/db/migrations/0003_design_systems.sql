CREATE TABLE IF NOT EXISTS design_systems (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL,
  tokens jsonb NOT NULL,
  design_markdown text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS design_systems_project_idx
  ON design_systems (project_id, updated_at);
