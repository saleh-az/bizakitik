import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get security logs from database
    const { data: securityLogs } = await supabase
      .from('security_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    // Get admin logs
    const { data: adminLogs } = await supabase
      .from('admin_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    // Get banned IPs
    const { data: bannedIPs } = await supabase
      .from('banned_ips')
      .select('*')
      .order('banned_at', { ascending: false });

    // Try to read log files
    let ddosLogs: any[] = [];
    try {
      const ddosLogContent = await Deno.readTextFile('./logs/ddos.log').catch(() => '');
      ddosLogs = ddosLogContent.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null)
        .slice(-100);
    } catch {
      // File doesn't exist
    }

    let adminFileLogs: any[] = [];
    try {
      const adminLogContent = await Deno.readTextFile('./logs/admin.log').catch(() => '');
      adminFileLogs = adminLogContent.split('\n')
        .filter(line => line.trim())
        .map(line => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(log => log !== null)
        .slice(-100);
    } catch {
      // File doesn't exist
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          securityLogs: securityLogs || [],
          adminLogs: adminLogs || [],
          bannedIPs: bannedIPs || [],
          ddosLogs,
          adminFileLogs,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});


