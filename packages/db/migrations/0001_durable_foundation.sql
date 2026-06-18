CREATE TYPE workspace_membership_role AS ENUM ('owner', 'member');
CREATE TYPE device_type AS ENUM ('mobile', 'tablet', 'desktop', 'agnostic');
CREATE TYPE generation_mode AS ENUM ('fast', 'quality');
CREATE TYPE generation_job_type AS ENUM ('generate_screen', 'edit_screen', 'generate_variants');
CREATE TYPE generation_job_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE screen_version_operation AS ENUM ('generate', 'edit', 'variant', 'import');
CREATE TYPE artifact_type AS ENUM ('screenshot', 'html', 'react_zip', 'image', 'log', 'figma_payload');

CREATE TABLE users (
  id text PRIMARY KEY,
  email text NOT NULL,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE workspaces (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspaces_slug_unique UNIQUE (slug)
);

CREATE TABLE workspace_memberships (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role workspace_membership_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX workspace_memberships_user_idx ON workspace_memberships(user_id);

CREATE TABLE projects (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  default_design_system_id text,
  CONSTRAINT projects_workspace_slug_unique UNIQUE (workspace_id, slug)
);

CREATE INDEX projects_workspace_updated_idx ON projects(workspace_id, updated_at DESC);

CREATE TABLE canvas_documents (
  project_id text PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  document jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE project_create_requests (
  workspace_id text NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, idempotency_key)
);

CREATE INDEX project_create_requests_project_idx ON project_create_requests(project_id);

CREATE TABLE screens (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  device_type device_type NOT NULL,
  current_version_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX screens_project_updated_idx ON screens(project_id, updated_at DESC);

CREATE TABLE screen_versions (
  id text PRIMARY KEY,
  screen_id text NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  version_number integer NOT NULL CHECK (version_number > 0),
  source_prompt text NOT NULL,
  operation screen_version_operation NOT NULL,
  design_spec jsonb NOT NULL,
  html_code text NOT NULL,
  react_code text,
  screenshot_artifact_id text,
  parent_version_id text REFERENCES screen_versions(id) ON DELETE SET NULL,
  provider text NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT screen_versions_screen_number_unique UNIQUE (screen_id, version_number)
);

CREATE INDEX screen_versions_screen_created_idx ON screen_versions(screen_id, created_at DESC);

CREATE TABLE generation_jobs (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type generation_job_type NOT NULL,
  status generation_job_status NOT NULL DEFAULT 'queued',
  prompt text NOT NULL,
  device_type device_type NOT NULL,
  mode generation_mode NOT NULL,
  request jsonb NOT NULL,
  result jsonb,
  error jsonb,
  idempotency_key text,
  provider text,
  model text,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  queue_name text NOT NULL DEFAULT 'generation',
  session_id text,
  continuation_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  CONSTRAINT generation_jobs_terminal_timestamps_check CHECK (
    (status <> 'completed' OR completed_at IS NOT NULL)
    AND (status <> 'cancelled' OR cancelled_at IS NOT NULL)
  )
);

CREATE INDEX generation_jobs_project_created_idx ON generation_jobs(project_id, created_at DESC);
CREATE INDEX generation_jobs_status_created_idx ON generation_jobs(status, created_at);
CREATE UNIQUE INDEX generation_jobs_project_idempotency_unique
  ON generation_jobs(project_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE TABLE artifacts (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  screen_version_id text REFERENCES screen_versions(id) ON DELETE CASCADE,
  type artifact_type NOT NULL,
  storage_key text NOT NULL,
  checksum text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artifacts_storage_key_unique UNIQUE (storage_key)
);

CREATE INDEX artifacts_project_created_idx ON artifacts(project_id, created_at DESC);
CREATE INDEX artifacts_screen_version_idx ON artifacts(screen_version_id);

ALTER TABLE screens
  ADD CONSTRAINT screens_current_version_fk
  FOREIGN KEY (current_version_id)
  REFERENCES screen_versions(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE screen_versions
  ADD CONSTRAINT screen_versions_screenshot_artifact_fk
  FOREIGN KEY (screenshot_artifact_id)
  REFERENCES artifacts(id)
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;
