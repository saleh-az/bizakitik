import { Post } from '@/lib/types';
import { PostImage } from './PostImage';
import { PostContent } from './PostContent';
import { formatTimestamp } from '@/lib/sanitize';
import { useState, useEffect } from 'react';

interface ReplyPostProps {
  post: Post;
  onQuoteClick?: (postNumber: number) => void;
  highlightedPost?: number | null;
}

export function ReplyPost({ post, onQuoteClick, highlightedPost }: ReplyPostProps) {
  const [isHighlighted, setIsHighlighted] = useState(false);
  
  useEffect(() => {
    if (highlightedPost === post.post_number) {
      setIsHighlighted(true);
      const timer = setTimeout(() => setIsHighlighted(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedPost, post.post_number]);
  
  return (
    <article 
      className={`post-container ml-4 ${isHighlighted ? 'reply-highlight animate-highlight' : ''}`}
      id={`p${post.post_number}`}
    >
      <header className="post-header">
        <span className="text-muted-foreground">Anonim</span>
        <span className="text-muted-foreground">{formatTimestamp(post.created_at)}</span>
        <span className="post-number">No.{post.post_number}</span>
      </header>
      
      <div className="p-2 overflow-hidden">
        {post.image_url && (
          <PostImage url={post.image_url} name={post.image_name} />
        )}
        <PostContent 
          content={post.content} 
          onQuoteClick={onQuoteClick}
        />
      </div>
    </article>
  );
}