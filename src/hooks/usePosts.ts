import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Post } from '@/lib/types';
import { generateIPHash } from '@/lib/hash';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export function usePosts(threadId: string) {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['posts', threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as Post[];
    },
    enabled: !!threadId,
  });
  
  // Subscribe to realtime updates
  useEffect(() => {
    if (!threadId) return;
    
    const channel = supabase
      .channel(`posts-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['posts', threadId] });
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);
  
  return query;
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      threadId,
      content,
      imageUrl,
      imageName,
      captchaToken,
    }: {
      threadId: string;
      content: string;
      imageUrl?: string;
      imageName?: string;
      captchaToken?: string;
    }) => {
      const ipHash = await generateIPHash();
      
      // Use edge function if captcha is required
      const captchaSiteKey = import.meta.env.VITE_HCAPTCHA_SITE_KEY || import.meta.env.VITE_RECAPTCHA_SITE_KEY;
      if (captchaSiteKey && captchaToken) {
        const response = await supabase.functions.invoke('create-post', {
          body: {
            thread_id: threadId,
            content,
            image_url: imageUrl,
            image_name: imageName,
            ip_hash: ipHash,
            captcha_token: captchaToken,
          },
        });
        
        if (response.error) throw response.error;
        if (response.data?.error) throw new Error(response.data.error);
        return response.data.data as Post;
      }
      
      // Fallback to direct insert if no captcha
      const { data, error } = await supabase
        .from('posts')
        .insert({
          thread_id: threadId,
          content,
          image_url: imageUrl || null,
          image_name: imageName || null,
          ip_hash: ipHash,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as Post;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['posts', variables.threadId] });
      queryClient.invalidateQueries({ queryKey: ['thread', variables.threadId] });
      toast({
        title: 'Cavab göndərildi',
        description: 'Cavabınız uğurla əlavə edildi.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Xəta',
        description: 'Cavab göndərilə bilmədi.',
        variant: 'destructive',
      });
    },
  });
}