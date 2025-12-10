import { useMemo } from 'react';
import { sanitizeText, formatPostContent } from '@/lib/sanitize';

interface PostContentProps {
  content: string;
  onQuoteClick?: (postNumber: number) => void;
}

export function PostContent({ content, onQuoteClick }: PostContentProps) {
  const formattedContent = useMemo(() => {
    const sanitized = sanitizeText(content);
    return formatPostContent(sanitized);
  }, [content]);
  
  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('quote-link') && onQuoteClick) {
      e.preventDefault();
      const quote = target.getAttribute('data-quote');
      if (quote) {
        onQuoteClick(parseInt(quote, 10));
      }
    }
  };
  
  return (
    <div 
      className="post-content"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: formattedContent }}
    />
  );
}