# Supabase Storage Setup - Manual Guide

Since the SQL script requires elevated permissions, follow these steps to set up storage manually via the Supabase Dashboard.

## Step 1: Create Storage Bucket

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `fbeqodbzlpcbourrazgo`

2. **Navigate to Storage**
   - Click "Storage" in the left sidebar
   - Click "Create a new bucket"

3. **Configure Bucket**
   - **Name:** `dispute-evidence`
   - **Public bucket:** OFF (keep it private)
   - **File size limit:** 10485760 (10MB in bytes)
   - **Allowed MIME types:** Leave empty for now (we'll configure in RLS)
   - Click "Create bucket"

## Step 2: Configure RLS Policies

1. **Enable RLS on storage.objects**
   - In the Storage page, click on the `dispute-evidence` bucket
   - Click "Policies" tab
   - RLS should already be enabled for storage.objects

2. **Add Upload Policy**
   - Click "New Policy"
   - Choose "Create policy from scratch"
   - **Policy name:** `Merchants can upload dispute evidence`
   - **Policy command:** INSERT
   - **Target roles:** authenticated
   - **USING expression:** (leave empty for INSERT)
   - **WITH CHECK expression:**
   ```sql
   (bucket_id = 'dispute-evidence'::text) AND
   ((storage.foldername(name))[1] = (auth.uid())::text)
   ```
   - Click "Review" then "Save policy"

3. **Add View Policy**
   - Click "New Policy"
   - Choose "Create policy from scratch"
   - **Policy name:** `Merchants can view own dispute evidence`
   - **Policy command:** SELECT
   - **Target roles:** authenticated
   - **USING expression:**
   ```sql
   (bucket_id = 'dispute-evidence'::text) AND
   ((storage.foldername(name))[1] = (auth.uid())::text)
   ```
   - Click "Review" then "Save policy"

4. **Add Update Policy**
   - Click "New Policy"
   - **Policy name:** `Merchants can update own dispute evidence`
   - **Policy command:** UPDATE
   - **Target roles:** authenticated
   - **USING expression:**
   ```sql
   (bucket_id = 'dispute-evidence'::text) AND
   ((storage.foldername(name))[1] = (auth.uid())::text)
   ```
   - **WITH CHECK expression:**
   ```sql
   (bucket_id = 'dispute-evidence'::text) AND
   ((storage.foldername(name))[1] = (auth.uid())::text)
   ```
   - Click "Review" then "Save policy"

5. **Add Service Role Policy**
   - Click "New Policy"
   - **Policy name:** `Service role can manage all dispute evidence`
   - **Policy command:** ALL
   - **Target roles:** Select "service_role" from dropdown
   - **USING expression:**
   ```sql
   bucket_id = 'dispute-evidence'::text
   ```
   - **WITH CHECK expression:**
   ```sql
   bucket_id = 'dispute-evidence'::text
   ```
   - Click "Review" then "Save policy"

6. **Prevent Deletion Policy**
   - Click "New Policy"
   - **Policy name:** `No deletion of dispute evidence`
   - **Policy command:** DELETE
   - **Target roles:** authenticated
   - **USING expression:**
   ```sql
   false
   ```
   - Click "Review" then "Save policy"

## Step 3: Verify Setup

1. **Check Bucket**
   - Go to Storage > dispute-evidence
   - You should see the bucket is created
   - Policies tab should show 5 policies

2. **Test Upload (Optional)**
   - In the Supabase Dashboard, try uploading a test file
   - Path: `test-merchant-id/test-dispute-id/test.pdf`
   - It should upload successfully

## Alternative: SQL Approach (If you have superuser access)

If you have direct database access or superuser permissions, you can run this instead:

```sql
-- First, insert the bucket (this usually works)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dispute-evidence',
  'dispute-evidence',
  false,
  10485760,
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
ON CONFLICT (id) DO NOTHING;
```

Then create the policies via the Dashboard UI as described above.

## Verification

After setup, verify with this SQL query:

```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE id = 'dispute-evidence';

-- Check policies exist
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%dispute%';
```

You should see:
- 1 bucket record
- 5 policy records

## Troubleshooting

**Issue:** Can't create policies
- **Solution:** Ensure you're logged in as the project owner
- Or use the SQL Editor with the service role key

**Issue:** Bucket already exists
- **Solution:** That's fine! Just skip bucket creation and add policies

**Issue:** Upload test fails
- **Solution:** Check RLS policies are active and expressions are correct
