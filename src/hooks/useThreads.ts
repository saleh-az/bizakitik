import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Thread } from '@/lib/types';
import { generateIPHash } from '@/lib/hash';
import { toast } from '@/hooks/use-toast';

export function useThreads(boardId: string) {
  return useQuery({
    queryKey: ['threads', boardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('board_id', boardId)
        .order('bumped_at', { ascending: false });
      
      if (error) throw error;
      return data as Thread[];
    },
    enabled: !!boardId,
  });
}

export function useThread(threadId: string) {
  return useQuery({
    queryKey: ['thread', threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('id', threadId)
        .maybeSingle();
      
      if (error) throw error;
      return data as Thread | null;
    },
    enabled: !!threadId,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      boardId,
      title,
      content,
      imageUrl,
      imageName,
      captchaToken,
    }: {
      boardId: string;
      title?: string;
      content: string;
      imageUrl?: string;
      imageName?: string;
      captchaToken?: string;
    }) => {
      const ipHash = await generateIPHash();
      
      // Use edge function if captcha is required
      const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.VITE_RECAPTCHA_SITE_KEY;
      if (captchaSiteKey && captchaToken) {
        const response = await supabase.functions.invoke('create-thread', {
          body: {
            board_id: boardId,
            title,
            content,
            image_url: imageUrl,
            image_name: imageName,
            ip_hash: ipHash,
            captcha_token: captchaToken,
          },
        });
        
        if (response.error) throw response.error;
        if (response.data?.error) throw new Error(response.data.error);
        return response.data.data as Thread;
      }
      
      // Fallback to direct insert if no captcha
      const { data, error } = await supabase
        .from('threads')
        .insert({
          board_id: boardId,
          title: title || null,
          content,
          image_url: imageUrl || null,
          image_name: imageName || null,
          ip_hash: ipHash,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Thread;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['threads', variables.boardId] });
      toast({
        title: 'Mövzu yaradıldı',
        description: 'Yeni mövzu uğurla əlavə edildi.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Xəta',
        description: 'Mövzu yaradıla bilmədi.',
        variant: 'destructive',
      });
    },
  });
}