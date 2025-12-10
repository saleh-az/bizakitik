import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rateLimitStore = new Map<string, { count: number; resetAt: number; strikes: number }>();

function getRealIP(req: Request): string {
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIP = req.headers.get('x-real-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIP) return xRealIP;
  return 'unknown';
}

function checkRateLimit(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const key = `rate_${ip}`;
  const data = rateLimitStore.get(key);
  
  if (!data || data.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 60000, strikes: 0 });
    return { allowed: true };
  }
  
  if (data.count >= 10) {
    data.strikes += 1;
    rateLimitStore.set(key, data);
    return { allowed: false, reason: 'Rate limit exceeded' };
  }
  
  data.count += 1;
  rateLimitStore.set(key, data);
  return { allowed: true };
}

async function verifyCaptcha(token: string): Promise<boolean> {
  const CAPTCHA_SECRET = Deno.env.get('HCAPTCHA_SECRET') || Deno.env.get('RECAPTCHA_SECRET');
  if (!CAPTCHA_SECRET || !token) return false;
  
  const captchaUrl = Deno.env.get('HCAPTCHA_SECRET')
    ? 'https://hcaptcha.com/siteverify'
    : 'https://www.google.com/recaptcha/api/siteverify';
  
  try {
    const response = await fetch(captchaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${CAPTCHA_SECRET}&response=${token}`,
    });
    const data = await response.json();
    return data.success === true;
  } catch {
    return false;
  }
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
  
  // Also store in database
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
    
    // Rate limiting for admin login
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      await logAdminAction('rate_limit_exceeded', ip, {});
      return new Response(
        JSON.stringify({ success: false, error: rateCheck.reason }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }
    
    const { password, captcha_token } = await req.json();
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');

    if (!adminPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin password not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Verify captcha if configured
    const CAPTCHA_SECRET = Deno.env.get('HCAPTCHA_SECRET') || Deno.env.get('RECAPTCHA_SECRET');
    if (CAPTCHA_SECRET) {
      if (!captcha_token || !(await verifyCaptcha(captcha_token))) {
        await logAdminAction('captcha_failed', ip, {});
        return new Response(
          JSON.stringify({ success: false, error: 'Captcha verification failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    if (password === adminPassword) {
      const token = crypto.randomUUID();
      await logAdminAction('login_success', ip, { token: token.substring(0, 8) + '...' });
      return new Response(
        JSON.stringify({ success: true, token }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await logAdminAction('login_failed', ip, {});
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid password' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
