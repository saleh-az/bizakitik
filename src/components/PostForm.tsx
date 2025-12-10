import { useState, useRef } from 'react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useRateLimit } from '@/hooks/useRateLimit';
import { Captcha } from './Captcha';

interface PostFormProps {
  onSubmit: (data: {
    title?: string;
    content: string;
    imageUrl?: string;
    imageName?: string;
    captchaToken?: string;
  }) => Promise<void>;
  isThread?: boolean;
  initialQuote?: string;
}

export function PostForm({ onSubmit, isThread = false, initialQuote = '' }: PostFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState(initialQuote);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { uploadImage, uploading } = useImageUpload();
  const { canPost, cooldown, startCooldown } = useRateLimit();
  
  const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.VITE_RECAPTCHA_SITE_KEY || '';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) return;
    if (!canPost) return;
    
    if (captchaSiteKey && !captchaToken) {
      setCaptchaError(true);
      return;
    }
    
    setSubmitting(true);
    setCaptchaError(false);
    
    try {
      let imageUrl: string | undefined;
      let imageName: string | undefined;
      
      if (selectedFile) {
        const result = await uploadImage(selectedFile);
        if (result) {
          imageUrl = result.url;
          imageName = result.name;
        }
      }
      
      await onSubmit({
        title: isThread ? title : undefined,
        content,
        imageUrl,
        imageName,
        captchaToken: captchaToken || undefined,
      });
      
      // Reset form
      setTitle('');
      setContent('');
      setSelectedFile(null);
      setCaptchaToken(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      startCooldown();
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  
  const isDisabled = submitting || uploading || !canPost;
  
  return (
    <form onSubmit={handleSubmit} className="thread-reply-form">
      <div className="space-y-2">
        {isThread && (
          <div>
            <label className="block text-sm font-mono mb-1">Başlıq:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="imageboard-input"
              placeholder="Mövzu başlığı (ixtiyari)"
              maxLength={200}
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-mono mb-1">
            {isThread ? 'Mətn:' : 'Cavab:'}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="imageboard-input min-h-[100px] resize-y"
            placeholder={isThread ? 'Mövzu məzmunu...' : 'Cavabınızı yazın...'}
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-mono mb-1">Şəkil (ixtiyari):</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
            className="imageboard-input text-sm"
          />
          {selectedFile && (
            <span className="text-xs text-muted-foreground ml-2">
              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)}MB)
            </span>
          )}
        </div>
        
        {captchaSiteKey && (
          <div>
            <label className="block text-sm font-mono mb-1">Təhlükəsizlik yoxlaması:</label>
            <Captcha
              siteKey={captchaSiteKey}
              onVerify={(token) => {
                setCaptchaToken(token);
                setCaptchaError(false);
              }}
              onExpire={() => {
                setCaptchaToken(null);
              }}
              onError={() => {
                setCaptchaToken(null);
                setCaptchaError(true);
              }}
            />
            {captchaError && (
              <p className="text-sm text-destructive mt-1">Zəhmət olmasa captcha-nı tamamlayın</p>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={isDisabled}
            className="imageboard-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Yüklənir...' : submitting ? 'Göndərilir...' : isThread ? 'Mövzu Yarat' : 'Göndər'}
          </button>
          
          {!canPost && (
            <span className="text-sm text-destructive font-mono">
              Gözləyin: {cooldown}s
            </span>
          )}
        </div>
      </div>
    </form>
  );
}