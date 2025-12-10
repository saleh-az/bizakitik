-- Create boards table
CREATE TABLE public.boards (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    slug VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    nsfw BOOLEAN DEFAULT false,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create threads table
CREATE TABLE public.threads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    board_id UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
    post_number SERIAL,
    title VARCHAR(200),
    content TEXT NOT NULL,
    image_url TEXT,
    image_name VARCHAR(255),
    ip_hash VARCHAR(64) NOT NULL,
    reply_count INTEGER DEFAULT 0,
    bumped_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create posts table (replies)
CREATE TABLE public.posts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
    post_number SERIAL,
    content TEXT NOT NULL,
    image_url TEXT,
    image_name VARCHAR(255),
    ip_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create banned_ips table
CREATE TABLE public.banned_ips (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL UNIQUE,
    reason TEXT,
    banned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Create rate_limits table for cooldown tracking
CREATE TABLE public.rate_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    ip_hash VARCHAR(64) NOT NULL,
    last_post_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Boards policies (public read, no public write)
CREATE POLICY "Anyone can view boards" ON public.boards FOR SELECT USING (true);

-- Threads policies (public read and insert)
CREATE POLICY "Anyone can view threads" ON public.threads FOR SELECT USING (true);
CREATE POLICY "Anyone can create threads" ON public.threads FOR INSERT WITH CHECK (true);

-- Posts policies (public read and insert)
CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Anyone can create posts" ON public.posts FOR INSERT WITH CHECK (true);

-- Rate limits policies
CREATE POLICY "Anyone can view rate limits" ON public.rate_limits FOR SELECT USING (true);
CREATE POLICY "Anyone can insert rate limits" ON public.rate_limits FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rate limits" ON public.rate_limits FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX idx_threads_board_id ON public.threads(board_id);
CREATE INDEX idx_threads_bumped_at ON public.threads(bumped_at DESC);
CREATE INDEX idx_posts_thread_id ON public.posts(thread_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at);
CREATE INDEX idx_banned_ips_hash ON public.banned_ips(ip_hash);
CREATE INDEX idx_rate_limits_ip_hash ON public.rate_limits(ip_hash);

-- Insert default boards
INSERT INTO public.boards (slug, name, description, nsfw) VALUES
    ('comfy', 'Rahat mövzular', 'Chill hər şey, rahat söhbətlər', false),
    ('b', 'Random', 'Kaos, hər cür mövzu', true),
    ('tek', 'Texnologiya', 'Cihazlar, proqramlaşdırma, texnika', false),
    ('v', 'Oyunlar', 'Video games, gaming', false),
    ('a', 'Anime', 'Anime və manga müzakirələri', false),
    ('kultur', 'Mədəniyyət', 'Tarix, sənət, mədəniyyət', false),
    ('meme', 'Memlər', 'Shitpost, troll content, memlər', true);

-- Function to increment post count
CREATE OR REPLACE FUNCTION public.increment_board_post_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.boards SET post_count = post_count + 1 WHERE id = NEW.board_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment reply count and bump thread
CREATE OR REPLACE FUNCTION public.increment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.threads 
    SET reply_count = reply_count + 1, bumped_at = now() 
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER on_thread_created
AFTER INSERT ON public.threads
FOR EACH ROW EXECUTE FUNCTION public.increment_board_post_count();

CREATE TRIGGER on_post_created
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.increment_reply_count();

-- Enable realtime for threads and posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;