import { useState } from 'react';

interface PostImageProps {
  url: string;
  name?: string | null;
}

export function PostImage({ url, name }: PostImageProps) {
  const [expanded, setExpanded] = useState(false);
  
  if (!url) return null;
  
  return (
    <div className="post-image mb-2">
      {name && (
        <div className="post-image-info mb-1">
          Fayl: <a href={url} target="_blank" rel="noopener noreferrer">{name}</a>
        </div>
      )}
      <img
        src={url}
        alt={name || 'Şəkil'}
        className={expanded ? 'expanded-image' : 'thumbnail'}
        onClick={() => setExpanded(!expanded)}
        loading="lazy"
      />
      {expanded && (
        <div className="text-xs text-muted-foreground mt-1">
          [Kiçiltmək üçün klikləyin]
        </div>
      )}
    </div>
  );
}