-- Studio v2: Add document column and schema_version to builder_pages
-- Allows new studio editor to coexist with legacy builder

-- Add new columns (nullable so existing rows are unaffected)
ALTER TABLE builder_pages
  ADD COLUMN IF NOT EXISTS document jsonb,
  ADD COLUMN IF NOT EXISTS schema_version int DEFAULT 1;

-- Index for filtering studio pages
CREATE INDEX IF NOT EXISTS idx_builder_pages_schema_version
  ON builder_pages (schema_version);

-- Studio components table (reusable component definitions)
CREATE TABLE IF NOT EXISTS studio_components (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text DEFAULT 'custom',
  definition jsonb NOT NULL,
  thumbnail_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Studio assets table (per-page asset references)
CREATE TABLE IF NOT EXISTS studio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid REFERENCES builder_pages(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image', 'video', 'font', 'svg', 'lottie')),
  url text NOT NULL,
  name text,
  width int,
  height int,
  mime text,
  size_bytes bigint,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_studio_assets_page_id
  ON studio_assets (page_id);
