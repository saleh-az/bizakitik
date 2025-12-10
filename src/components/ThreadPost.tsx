import { Thread } from '@/lib/types';
import { PostImage } from './PostImage';
import { PostContent } from './PostContent';
import { formatTimestamp } from '@/lib/sanitize';

interface ThreadPostProps {
  thread: Thread;
  isPreview?: boolean;
  onQuoteClick?: (postNumber: number) => void;
}

export function ThreadPost({ thread, isPreview = false, onQuoteClick }: ThreadPostProps) {
  const truncatedContent = isPreview && thread.content.length > 500
    ? thread.content.substring(0, 500) + '...'
    : thread.content;
  
  return (
    <article className="post-container" id={`p${thread.post_number}`}>
      <header className="post-header">
        {thread.title && (
          <span className="font-bold text-primary">{thread.title}</span>
        )}
        <span className="text-muted-foreground">Anonim</span>
        <span className="text-muted-foreground">{formatTimestamp(thread.created_at)}</span>
        <span className="post-number">No.{thread.post_number}</span>
        {isPreview && (
          <span className="text-muted-foreground ml-auto">
            [{thread.reply_count} cavab]
          </span>
        )}
      </header>
      
      <div className="p-2 overflow-hidden">
        {thread.image_url && (
          <PostImage url={thread.image_url} name={thread.image_name} />
        )}
        <PostContent 
          content={truncatedContent} 
          onQuoteClick={onQuoteClick}
        />
        {isPreview && thread.content.length > 500 && (
          <div className="text-sm text-primary mt-2">
            [Davamını oxumaq üçün klikləyin]
          </div>
        )}
      </div>
    </article>
  );
}