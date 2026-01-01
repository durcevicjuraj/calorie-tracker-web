-- Create storage bucket for food images
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Anyone can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'food-images');

-- Allow anyone to view images (public bucket)
CREATE POLICY "Images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'food-images');

-- Allow users to delete images
CREATE POLICY "Anyone can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'food-images');
