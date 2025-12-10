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
    const { type, id, token } = await req.json();
    
    if (!token) {
      await logAdminAction('unauthorized_access', ip, { type, id });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    if (!type || !id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: type and id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (type === 'thread') {
      const { error: postsError } = await supabase.from('posts').delete().eq('thread_id', id);
      if (postsError) throw postsError;
      
      const { error: threadError } = await supabase.from('threads').delete().eq('id', id);
      if (threadError) throw threadError;
      
      await logAdminAction('thread_deleted', ip, { threadId: id });
    } else if (type === 'post') {
      const { error: postError } = await supabase.from('posts').delete().eq('id', id);
      if (postError) throw postError;
      
      await logAdminAction('post_deleted', ip, { postId: id });
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid type. Must be "thread" or "post"' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
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