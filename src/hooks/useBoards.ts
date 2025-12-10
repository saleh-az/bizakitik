import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Board } from '@/lib/types';

export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('slug');
      
      if (error) throw error;
      return data as Board[];
    },
  });
}

export function useBoard(slug: string) {
  return useQuery({
    queryKey: ['board', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data as Board | null;
    },
    enabled: !!slug,
  });
}