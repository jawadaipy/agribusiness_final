-- ================================================================
-- AgriBusiness — Migration 06: Storage Buckets & Policies
-- ================================================================
-- Buckets are created via the storage schema (idempotent ON CONFLICT).
-- File-size limits are in bytes; MIME arrays are enforced at bucket level.
-- Per-MIME size enforcement for problem-media is done in storage policies below.
-- ================================================================

-- ----------------------------------------------------------------
-- BUCKET DEFINITIONS
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  -- Public: profile photos. 5 MB max. Images only.
  (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  ),
  -- Public: listing product images. 5 MB max.
  (
    'listing-images',
    'listing-images',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  -- Private (auth required): mixed media for problem posts.
  -- Bucket limit = 50 MB (video cap); per-type sub-limits enforced in policies.
  (
    'problem-media',
    'problem-media',
    false,
    52428800,
    ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif',
      'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4',
      'video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'
    ]
  ),
  -- Private: chat file attachments. 50 MB max. Any MIME.
  (
    'chat-attachments',
    'chat-attachments',
    false,
    52428800,
    NULL   -- any MIME allowed for chat
  ),
  -- Public: ad creative images. 5 MB max.
  (
    'ad-creatives',
    'ad-creatives',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
  )
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- STORAGE RLS POLICIES
-- Convention: files are stored as {user_id}/{filename}
--   so (storage.foldername(name))[1] = user's UUID
-- ================================================================

-- ----------------------------------------------------------------
-- AVATARS
-- ----------------------------------------------------------------
CREATE POLICY "avatars:select:public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars:insert:own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars:update:own_folder"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "avatars:delete:own_folder_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- LISTING IMAGES
-- ----------------------------------------------------------------
CREATE POLICY "listing_images:select:public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

CREATE POLICY "listing_images:insert:own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "listing_images:delete:own_folder_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- PROBLEM MEDIA  (auth-only read; size sub-limits by MIME group)
-- Images ≤5 MB | Audio ≤10 MB | Video ≤50 MB
-- The bucket limit (50 MB) acts as the outer cap.
-- Per-type limits are enforced via metadata->>'size' checks.
-- Note: Supabase Storage populates metadata on upload so this
--       comparison is reliable server-side.
-- ----------------------------------------------------------------
CREATE POLICY "problem_media:select:authenticated"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'problem-media'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "problem_media:insert:own_folder_with_size_limits"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'problem-media'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND (
      -- Images: ≤ 5 MB
      (
        (metadata->>'mimetype' LIKE 'image/%')
        AND (metadata->>'size')::bigint <= 5242880
      )
      OR
      -- Audio: ≤ 10 MB
      (
        (metadata->>'mimetype' LIKE 'audio/%')
        AND (metadata->>'size')::bigint <= 10485760
      )
      OR
      -- Video: ≤ 50 MB
      (
        (metadata->>'mimetype' LIKE 'video/%')
        AND (metadata->>'size')::bigint <= 52428800
      )
    )
  );

CREATE POLICY "problem_media:delete:own_folder_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'problem-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- CHAT ATTACHMENTS
-- ----------------------------------------------------------------
CREATE POLICY "chat_attachments:select:authenticated"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "chat_attachments:insert:own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "chat_attachments:delete:own_folder_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'admin'
    )
  );

-- ----------------------------------------------------------------
-- AD CREATIVES
-- ----------------------------------------------------------------
CREATE POLICY "ad_creatives:select:public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ad-creatives');

CREATE POLICY "ad_creatives:insert:own_folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ad-creatives'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "ad_creatives:delete:own_folder_or_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ad-creatives'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.get_my_role() = 'admin'
    )
  );
