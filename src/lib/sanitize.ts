// Enhanced sanitize text input to prevent XSS and SQL injection
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\x00/g, '')
    .replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<script/gi, '')
    .replace(/<\/script>/gi, '')
    .replace(/<iframe/gi, '')
    .replace(/<object/gi, '')
    .replace(/<embed/gi, '')
    .replace(/<link/gi, '')
    .replace(/<meta/gi, '')
    .replace(/<style/gi, '')
    .trim();
}

// SQL injection prevention
export function sanitizeSQL(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/xp_/gi, '')
    .replace(/sp_/gi, '')
    .replace(/exec/gi, '')
    .replace(/execute/gi, '')
    .replace(/union/gi, '')
    .replace(/select/gi, '')
    .replace(/insert/gi, '')
    .replace(/update/gi, '')
    .replace(/delete/gi, '')
    .replace(/drop/gi, '')
    .trim();
}

// Validate and sanitize user input
export function validateInput(input: string, maxLength: number = 10000): string {
  if (typeof input !== 'string') return '';
  
  const sanitized = sanitizeText(input);
  
  if (sanitized.length > maxLength) {
    return sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

// Format post content with greentext and quotes
export function formatPostContent(content: string): string {
  const lines = content.split('\n');
  
  return lines.map(line => {
    // Greentext (lines starting with >)
    if (line.startsWith('&gt;') && !line.startsWith('&gt;&gt;')) {
      return `<span class="greentext">${line}</span>`;
    }
    
    // Quote links (>>number)
    const quoteRegex = /&gt;&gt;(\d+)/g;
    line = line.replace(quoteRegex, '<a href="#p$1" class="quote-link" data-quote="$1">&gt;&gt;$1</a>');
    
    return line;
  }).join('\n');
}

// Format timestamp
export function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  // If less than 24 hours, show relative time
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours} saat əvvəl`;
    }
    if (minutes > 0) {
      return `${minutes} dəqiqə əvvəl`;
    }
    return 'indicə';
  }
  
  // Otherwise show full date
  return date.toLocaleDateString('az-AZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
