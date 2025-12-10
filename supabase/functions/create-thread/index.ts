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
  
  if (data.count >= 30) {
    data.strikes += 1;
    rateLimitStore.set(key, data);
    return { allowed: false, reason: 'Rate limit exceeded' };
  }
  
  data.count += 1;
  rateLimitStore.set(key, data);
  return { allowed: true };
}

function checkFlood(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const key = `flood_${ip}`;
  const data = rateLimitStore.get(key);
  
  if (!data || data.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + 5000, strikes: 0 });
    return { allowed: true };
  }
  
  if (data.count >= 10) {
    return { allowed: false, reason: 'Flood protection triggered' };
  }
  
  data.count += 1;
  rateLimitStore.set(key, data);
  return { allowed: true };
}

async function checkIPBan(ipHash: string, supabase: any): Promise<{ allowed: boolean; reason?: string }> {
  if (!ipHash) return { allowed: true };
  
  const { data } = await supabase
    .from('banned_ips')
    .select('*')
    .eq('ip_hash', ipHash)
    .maybeSingle();
  
  if (data) {
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      await supabase.from('banned_ips').delete().eq('id', data.id);
      return { allowed: true };
    }
    return { allowed: false, reason: data.reason || 'IP banned' };
  }
  
  return { allowed: true };
}

function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .substring(0, 10000);
}

function checkProfanity(content: string): { allowed: boolean; reason?: string } {
  const bannedWords = ['spam', 'scam', 'phishing', 'malware', 'virus'];
  const lowerContent = content.toLowerCase();
  
  for (const word of bannedWords) {
    if (lowerContent.includes(word)) {
      return { allowed: false, reason: 'Prohibited content detected' };
    }
  }
  
  const words = content.split(/\s+/);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  
  for (const [word, count] of wordCounts) {
    if (count > 10 && word.length > 3) {
      return { allowed: false, reason: 'Spam detected' };
    }
  }
  
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

async function logSecurityEvent(type: string, ip: string, details: Record<string, any>): Promise<void> {
  const logEntry = {
    type,
    ip,
    details: JSON.stringify(details),
    timestamp: new Date().toISOString(),
  };
  
  try {
    await Deno.writeTextFile(
      `./logs/ddos.log`,
      JSON.stringify(logEntry) + '\n',
      { append: true, create: true }
    );
  } catch {
    // Continue if logging fails
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ip = getRealIP(req);
    
    // Rate limiting
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      await logSecurityEvent('rate_limit', ip, {});
      return new Response(
        JSON.stringify({ error: rateCheck.reason }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }
    
    // Flood protection
    const floodCheck = checkFlood(ip);
    if (!floodCheck.allowed) {
      await logSecurityEvent('ddos', ip, {});
      return new Response(
        JSON.stringify({ error: floodCheck.reason }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }
    
    const { ip_hash, captcha_token, board_id, title, content, image_url, image_name } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check IP ban
    const banCheck = await checkIPBan(ip_hash, supabase);
    if (!banCheck.allowed) {
      await logSecurityEvent('banned_ip', ip, { ip_hash });
      return new Response(
        JSON.stringify({ error: banCheck.reason, banned: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Sanitize inputs
    const sanitizedTitle = title ? sanitizeInput(title) : null;
    const sanitizedContent = sanitizeInput(content);
    
    if (!sanitizedContent || sanitizedContent.length < 1) {
      return new Response(
        JSON.stringify({ error: 'Invalid content' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Check profanity/spam
    const profanityCheck = checkProfanity(sanitizedContent);
    if (!profanityCheck.allowed) {
      await logSecurityEvent('profanity_blocked', ip, { ip_hash, content: sanitizedContent.substring(0, 100) });
      return new Response(
        JSON.stringify({ error: profanityCheck.reason }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Verify captcha
    const CAPTCHA_SECRET = Deno.env.get('HCAPTCHA_SECRET') || Deno.env.get('RECAPTCHA_SECRET');
    if (CAPTCHA_SECRET) {
      if (!captcha_token || !(await verifyCaptcha(captcha_token))) {
        return new Response(
          JSON.stringify({ error: 'Captcha verification failed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
    }

    // Create thread
    const { data, error } = await supabase
      .from('threads')
      .insert({
        board_id,
        title: sanitizedTitle,
        content: sanitizedContent,
        image_url: image_url || null,
        image_name: image_name || null,
        ip_hash: ip_hash || null,
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
