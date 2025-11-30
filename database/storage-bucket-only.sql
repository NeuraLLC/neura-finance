-- ==============================================
-- CREATE STORAGE BUCKET ONLY
-- ==============================================
-- This creates just the bucket. RLS policies must be added via Supabase Dashboard.
-- Run this in Supabase SQL Editor.

-- Create bucket for dispute evidence files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispute-evidence',
  'dispute-evidence',
  false, -- Private bucket
  10485760, -- 10MB in bytes
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Verify bucket was created
SELECT id, name, public, file_size_limit, created_at
FROM storage.buckets
WHERE id = 'dispute-evidence';

-- ==============================================
-- NEXT STEPS
-- ==============================================
-- After running this script successfully, you need to add RLS policies.
--
-- Follow the manual guide in: database/storage-setup-manual.md
--
-- Or use Supabase Dashboard:
-- 1. Go to Storage > dispute-evidence
-- 2. Click "Policies" tab
-- 3. Add the 5 policies as described in storage-setup-manual.md
