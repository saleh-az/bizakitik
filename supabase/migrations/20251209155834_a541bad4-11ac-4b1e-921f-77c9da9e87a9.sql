-- Fix function search path issues
CREATE OR REPLACE FUNCTION public.increment_board_post_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.boards SET post_count = post_count + 1 WHERE id = NEW.board_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.threads 
    SET reply_count = reply_count + 1, bumped_at = now() 
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add policy for banned_ips (admin only via edge function)
CREATE POLICY "Public can check bans" ON public.banned_ips FOR SELECT USING (true);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('images', 'images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

-- Storage policies
CREATE POLICY "Anyone can view images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Anyone can upload images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');