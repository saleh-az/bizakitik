import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function useImageUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const uploadImage = async (file: File): Promise<{ url: string; name: string } | null> => {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Fayl çox böyükdür',
        description: 'Maksimum fayl ölçüsü 5MB-dır.',
        variant: 'destructive',
      });
      return null;
    }
    
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: 'Yanlış fayl növü',
        description: 'Yalnız JPG, PNG, GIF və WebP faylları icazəlidir.',
        variant: 'destructive',
      });
      return null;
    }
    
    setUploading(true);
    setProgress(0);
    
    try {
      // Generate unique filename
      const ext = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `uploads/${fileName}`;
      
      const { error } = await supabase.storage
        .from('images')
        .upload(filePath, file);
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
      
      setProgress(100);
      
      return {
        url: publicUrl,
        name: file.name,
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Yükləmə xətası',
        description: 'Şəkil yüklənə bilmədi.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };
  
  return { uploadImage, uploading, progress };
}