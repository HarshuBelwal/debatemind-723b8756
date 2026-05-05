
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.arguments ADD COLUMN IF NOT EXISTS image_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('argument-images', 'argument-images', true) ON CONFLICT (id) DO NOTHING;

-- Avatars policies
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Argument images policies
CREATE POLICY "Argument images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'argument-images');

CREATE POLICY "Users can upload their own argument images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'argument-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own argument images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'argument-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own argument images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'argument-images' AND auth.uid()::text = (storage.foldername(name))[1]);
