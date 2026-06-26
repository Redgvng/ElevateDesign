CREATE TABLE IF NOT EXISTS share_links (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  screen_version_id text NOT NULL REFERENCES screen_versions (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS share_links_screen_version_idx
  ON share_links (screen_version_id);
