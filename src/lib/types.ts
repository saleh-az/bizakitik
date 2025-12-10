export interface Board {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  nsfw: boolean;
  post_count: number;
  created_at: string;
}

export interface Thread {
  id: string;
  board_id: string;
  post_number: number;
  title: string | null;
  content: string;
  image_url: string | null;
  image_name: string | null;
  ip_hash: string;
  reply_count: number;
  bumped_at: string;
  created_at: string;
}

export interface Post {
  id: string;
  thread_id: string;
  post_number: number;
  content: string;
  image_url: string | null;
  image_name: string | null;
  ip_hash: string;
  created_at: string;
}

export interface BannedIP {
  id: string;
  ip_hash: string;
  reason: string | null;
  banned_at: string;
  expires_at: string | null;
}

export interface RateLimit {
  id: string;
  ip_hash: string;
  last_post_at: string;
}