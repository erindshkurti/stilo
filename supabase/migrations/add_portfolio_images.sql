-- Create business_portfolio_images table
CREATE TABLE IF NOT EXISTS business_portfolio_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_portfolio_business_id ON business_portfolio_images(business_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_featured ON business_portfolio_images(business_id, is_featured);

-- Ensure only one featured image per business
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_featured_per_business 
ON business_portfolio_images(business_id) 
WHERE is_featured = true;

-- Create storage bucket for portfolio images
INSERT INTO storage.buckets (id, name, public)
VALUES ('stilo.business.portfolio', 'stilo.business.portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for portfolio bucket
CREATE POLICY "Portfolio images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'stilo.business.portfolio');

CREATE POLICY "Business owners can upload portfolio images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'stilo.business.portfolio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Business owners can update their portfolio images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'stilo.business.portfolio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Business owners can delete their portfolio images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'stilo.business.portfolio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policies for business_portfolio_images table
ALTER TABLE business_portfolio_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portfolio images"
ON business_portfolio_images FOR SELECT
USING (true);

CREATE POLICY "Business owners can insert their portfolio images"
ON business_portfolio_images FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update their portfolio images"
ON business_portfolio_images FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Business owners can delete their portfolio images"
ON business_portfolio_images FOR DELETE
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  )
);
