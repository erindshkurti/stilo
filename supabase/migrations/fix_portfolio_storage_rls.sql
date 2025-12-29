-- Drop existing RLS policies for portfolio bucket
DROP POLICY IF EXISTS "Business owners can upload portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update their portfolio images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete their portfolio images" ON storage.objects;

-- Create updated RLS policies that check business ownership
CREATE POLICY "Business owners can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stilo.business.portfolio' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update their portfolio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'stilo.business.portfolio' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete their portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stilo.business.portfolio' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);
