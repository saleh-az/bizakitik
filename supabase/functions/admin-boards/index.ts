import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getRealIP(req: Request): string {
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIP = req.headers.get('x-real-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIP) return xRealIP;
  return 'unknown';
}

function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .substring(0, 200);
}

async function logAdminAction(action: string, ip: string, details: Record<string, any>): Promise<void> {
  const logEntry = {
    action,
    ip,
    details: JSON.stringify(details),
    timestamp: new Date().toISOString(),
  };
  
  try {
    await Deno.writeTextFile(
      `./logs/admin.log`,
      JSON.stringify(logEntry) + '\n',
      { append: true, create: true }
    );
  } catch {
    // Continue if logging fails
  }
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    await supabase.from('admin_logs').insert({
      action,
      ip_address: ip,
      details: logEntry.details,
      created_at: logEntry.timestamp,
    });
  } catch {
    // Table might not exist, continue
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = getRealIP(req);
    const { action, token, board, boardId } = await req.json();
    
    if (!token) {
      await logAdminAction('unauthorized_access', ip, { action });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (action === 'add' && board) {
      const sanitizedBoard = {
        slug: sanitizeInput(board.slug).toLowerCase().replace(/[^a-z0-9]/g, ''),
        name: sanitizeInput(board.name),
        description: board.description ? sanitizeInput(board.description) : null,
        nsfw: board.nsfw || false,
      };
      
      const { error } = await supabase.from('boards').insert(sanitizedBoard);
      if (error) throw error;
      
      await logAdminAction('board_added', ip, { board: sanitizedBoard });
    } else if (action === 'delete' && boardId) {
      await supabase.from('boards').delete().eq('id', boardId);
      await logAdminAction('board_deleted', ip, { boardId });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
