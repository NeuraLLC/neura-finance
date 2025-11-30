-- ==============================================
-- SUPABASE STORAGE SETUP FOR DISPUTE EVIDENCE
-- ==============================================
-- This file sets up storage buckets and RLS policies for dispute evidence files
--
-- ⚠️ IMPORTANT: This script requires elevated permissions
-- If you get "ERROR: must be owner of table objects", use one of these alternatives:
--
-- Option 1 (Recommended): Manual setup via Supabase Dashboard
--   - Follow guide: database/storage-setup-manual.md
--
-- Option 2: Run bucket creation only, then add policies via Dashboard
--   - Run: database/storage-bucket-only.sql
--   - Then add policies via Dashboard UI
--
-- ==============================================
-- CREATE STORAGE BUCKETS
-- ==============================================

-- Create bucket for dispute evidence files
-- Run this in Supabase Dashboard > Storage or via SQL
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispute-evidence',
  'dispute-evidence',
  false, -- Private bucket, requires authentication
  10485760, -- 10MB file size limit
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

-- ==============================================
-- STORAGE RLS POLICIES
-- ==============================================

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Merchants can upload files to their own dispute evidence folder
CREATE POLICY "Merchants can upload dispute evidence"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dispute-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Merchants can view their own dispute evidence files
CREATE POLICY "Merchants can view own dispute evidence"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'dispute-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Merchants can update their own dispute evidence files
CREATE POLICY "Merchants can update own dispute evidence"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dispute-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'dispute-evidence' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Service role has full access
CREATE POLICY "Service role can manage all dispute evidence"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'dispute-evidence');

-- Policy: No deletion of evidence files (audit trail)
CREATE POLICY "No deletion of dispute evidence"
ON storage.objects
FOR DELETE
TO authenticated
USING (false);

-- ==============================================
-- FILE PATH STRUCTURE
-- ==============================================

/*
Files will be stored with this structure:
dispute-evidence/
  {merchant_id}/
    {dispute_id}/
      receipt_20231215_123456.pdf
      shipping_20231215_123457.pdf
      communication_20231215_123458.png

Example path:
dispute-evidence/550e8400-e29b-41d4-a716-446655440000/dis_1AbcDef123/receipt_20231215_123456.pdf

This structure ensures:
1. Merchant isolation - RLS checks first folder matches auth.uid()
2. Dispute organization - Easy to find all files for a dispute
3. File identification - Filename includes evidence type and timestamp
*/

-- ==============================================
-- GRANTS
-- ==============================================

-- Grant authenticated users access to storage
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'dispute-evidence';

-- Check policies are active
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as "Command"
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%dispute%'
ORDER BY policyname;

-- ==============================================
-- USAGE EXAMPLES
-- ==============================================

/*
1. Upload file from frontend:
const { data, error } = await supabase.storage
  .from('dispute-evidence')
  .upload(`${merchantId}/${disputeId}/receipt_${Date.now()}.pdf`, file)

2. Get public URL (signed for private bucket):
const { data } = await supabase.storage
  .from('dispute-evidence')
  .createSignedUrl(`${merchantId}/${disputeId}/receipt_12345.pdf`, 3600)

3. Download file:
const { data, error } = await supabase.storage
  .from('dispute-evidence')
  .download(`${merchantId}/${disputeId}/receipt_12345.pdf`)
*/
