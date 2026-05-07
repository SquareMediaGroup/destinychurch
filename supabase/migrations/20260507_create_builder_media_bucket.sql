-- Create storage bucket for AI page builder media uploads
-- Stores images (webp variants) and video metadata for use in builder pages

-- Create the bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'builder-media',
  'builder-media',
  true,
  5242880, -- 5MB limit per file
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Public read access (anyone can view media on published pages)
CREATE POLICY "Public can read builder-media"
ON storage.objects FOR SELECT
USING (bucket_id = 'builder-media');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload builder-media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'builder-media');

-- Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update builder-media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'builder-media');

-- Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete builder-media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'builder-media');

-- Create a metadata table for tracking media uploads with AI context
CREATE TABLE IF NOT EXISTS builder_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_url text, -- nullable for video records
  hero_url text,
  general_url text,
  thumbnail_url text,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  source_type text NOT NULL CHECK (source_type IN ('upload', 'youtube', 'vimeo', 'external')),
  external_url text, -- For YouTube/Vimeo/external videos
  purpose text, -- 'hero', 'background', 'team', 'event', 'general', 'logo'
  description text, -- AI-readable description
  alt_text text,
  width integer,
  height integer,
  size_bytes integer,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for querying media by purpose
CREATE INDEX IF NOT EXISTS builder_media_purpose_idx ON builder_media(purpose);
CREATE INDEX IF NOT EXISTS builder_media_created_at_idx ON builder_media(created_at DESC);

-- Enable RLS
ALTER TABLE builder_media ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all media
CREATE POLICY "Authenticated users can read builder_media"
ON builder_media FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can insert
CREATE POLICY "Authenticated users can insert builder_media"
ON builder_media FOR INSERT
TO authenticated
WITH CHECK (true);

-- Authenticated users can update
CREATE POLICY "Authenticated users can update builder_media"
ON builder_media FOR UPDATE
TO authenticated
USING (true);

-- Authenticated users can delete
CREATE POLICY "Authenticated users can delete builder_media"
ON builder_media FOR DELETE
TO authenticated
USING (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_builder_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER builder_media_updated_at
  BEFORE UPDATE ON builder_media
  FOR EACH ROW
  EXECUTE FUNCTION update_builder_media_updated_at();
