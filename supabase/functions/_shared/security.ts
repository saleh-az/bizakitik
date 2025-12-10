import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  blockDuration?: number;
}

export interface RateLimitData {
  count: number;
  resetAt: number;
  strikes: number;
}

// In-memory rate limit store
const rateLimitStore = new Map<string, RateLimitData>();

// Get real IP from request (Cloudflare compatible)
export function getRealIP(req: Request): string {
  const cfConnectingIP = req.headers.get('cf-connecting-ip');
  const xForwardedFor = req.headers.get('x-forwarded-for');
  const xRealIP = req.headers.get('x-real-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (xForwardedFor) return xForwardedFor.split(',')[0].trim();
  if (xRealIP) return xRealIP;
  
  return 'unknown';
}

// Check rate limit
export function checkRateLimit(ip: string, limit: number, windowMs: number): SecurityCheckResult {
  const now = Date.now();
  const key = `rate_${ip}`;
  const data = rateLimitStore.get(key);
  
  if (!data || data.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
      strikes: 0,
    });
    return { allowed: true };
  }
  
  if (data.count >= limit) {
    data.strikes += 1;
    rateLimitStore.set(key, data);
    
    // Block for increasing duration based on strikes
    const blockDuration = Math.min(data.strikes * 5, 60); // Max 60 minutes
    
    return {
      allowed: false,
      reason: 'Rate limit exceeded',
      blockDuration,
    };
  }
  
  data.count += 1;
  rateLimitStore.set(key, data);
  return { allowed: true };
}

// Check flood protection (too many requests in short time)
export function checkFloodProtection(ip: string, maxRequests: number = 10, windowMs: number = 5000): SecurityCheckResult {
  const now = Date.now();
  const key = `flood_${ip}`;
  const data = rateLimitStore.get(key);
  
  if (!data || data.resetAt < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
      strikes: 0,
    });
    return { allowed: true };
  }
  
  if (data.count >= maxRequests) {
    return {
      allowed: false,
      reason: 'Flood protection triggered',
      blockDuration: 15, // 15 minutes
    };
  }
  
  data.count += 1;
  rateLimitStore.set(key, data);
  return { allowed: true };
}

// Check if IP is banned
export async function checkIPBan(ipHash: string, supabase: any): Promise<SecurityCheckResult> {
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
    
    return {
      allowed: false,
      reason: data.reason || 'IP banned',
    };
  }
  
  return { allowed: true };
}

// Check TOR exit nodes
export async function checkTorExitNode(ip: string): Promise<SecurityCheckResult> {
  try {
    const torList = await Deno.readTextFile('./torlist.json').catch(() => '[]');
    const torIPs: string[] = JSON.parse(torList);
    
    if (torIPs.includes(ip)) {
      return {
        allowed: false,
        reason: 'TOR exit node detected',
      };
    }
    
    // Check IP ranges
    for (const range of torIPs) {
      if (range.includes('/')) {
        if (isIPInRange(ip, range)) {
          return {
            allowed: false,
            reason: 'TOR exit node detected',
          };
        }
      }
    }
  } catch {
    // If file doesn't exist, allow
  }
  
  return { allowed: true };
}

// Check VPN/Proxy
export async function checkVPNProxy(ip: string): Promise<SecurityCheckResult> {
  try {
    const vpnList = await Deno.readTextFile('./vpnlist.json').catch(() => '[]');
    const vpnIPs: string[] = JSON.parse(vpnList);
    
    if (vpnIPs.includes(ip)) {
      return {
        allowed: false,
        reason: 'VPN/Proxy detected',
      };
    }
    
    // Check IP ranges
    for (const range of vpnIPs) {
      if (range.includes('/')) {
        if (isIPInRange(ip, range)) {
          return {
            allowed: false,
            reason: 'VPN/Proxy detected',
          };
        }
      }
    }
  } catch {
    // If file doesn't exist, allow
  }
  
  return { allowed: true };
}

// Helper: Check if IP is in CIDR range
function isIPInRange(ip: string, cidr: string): boolean {
  const [rangeIP, prefix] = cidr.split('/');
  const mask = parseInt(prefix);
  
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(rangeIP);
  const maskNum = (0xFFFFFFFF << (32 - mask)) >>> 0;
  
  return (ipNum & maskNum) === (rangeNum & maskNum);
}

function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

// Log security event
export async function logSecurityEvent(
  type: string,
  ip: string,
  details: Record<string, any>,
  supabase: any
): Promise<void> {
  const logEntry = {
    type,
    ip,
    details: JSON.stringify(details),
    timestamp: new Date().toISOString(),
  };
  
  try {
    await Deno.writeTextFile(
      `./logs/${type}.log`,
      JSON.stringify(logEntry) + '\n',
      { append: true, create: true }
    );
  } catch {
    // Logging failed, continue
  }
  
  // Also store in database if table exists
  try {
    await supabase.from('security_logs').insert({
      event_type: type,
      ip_address: ip,
      details: logEntry.details,
      created_at: logEntry.timestamp,
    });
  } catch {
    // Table might not exist, continue
  }
}

// Sanitize input
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
    .substring(0, 10000); // Max length
}

// Check profanity/spam
export function checkProfanity(content: string): SecurityCheckResult {
  const bannedWords = [
    'spam', 'scam', 'phishing', 'malware', 'virus',
    // Add more banned words as needed
  ];
  
  const lowerContent = content.toLowerCase();
  
  for (const word of bannedWords) {
    if (lowerContent.includes(word)) {
      return {
        allowed: false,
        reason: 'Prohibited content detected',
      };
    }
  }
  
  // Check for excessive repetition (spam detection)
  const words = content.split(/\s+/);
  const wordCounts = new Map<string, number>();
  
  for (const word of words) {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }
  
  for (const [word, count] of wordCounts) {
    if (count > 10 && word.length > 3) {
      return {
        allowed: false,
        reason: 'Spam detected',
      };
    }
  }
  
  return { allowed: true };
}

// Verify captcha
export async function verifyCaptcha(token: string): Promise<boolean> {
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

// Comprehensive security check
export async function performSecurityCheck(
  req: Request,
  ipHash: string,
  supabase: any,
  requireCaptcha: boolean = false,
  captchaToken?: string
): Promise<SecurityCheckResult> {
  const ip = getRealIP(req);
  
  // Check rate limit
  const rateLimit = checkRateLimit(ip, 30, 60000); // 30 requests per minute
  if (!rateLimit.allowed) {
    await logSecurityEvent('rate_limit', ip, { ipHash }, supabase);
    return rateLimit;
  }
  
  // Check flood protection
  const floodCheck = checkFloodProtection(ip, 10, 5000); // 10 requests in 5 seconds
  if (!floodCheck.allowed) {
    await logSecurityEvent('ddos', ip, { ipHash }, supabase);
    return floodCheck;
  }
  
  // Check IP ban
  const banCheck = await checkIPBan(ipHash, supabase);
  if (!banCheck.allowed) {
    await logSecurityEvent('banned_ip', ip, { ipHash }, supabase);
    return banCheck;
  }
  
  // Check TOR
  const torCheck = await checkTorExitNode(ip);
  if (!torCheck.allowed) {
    await logSecurityEvent('tor_blocked', ip, { ipHash }, supabase);
    return torCheck;
  }
  
  // Check VPN/Proxy
  const vpnCheck = await checkVPNProxy(ip);
  if (!vpnCheck.allowed) {
    await logSecurityEvent('vpn_blocked', ip, { ipHash }, supabase);
    return vpnCheck;
  }
  
  // Verify captcha if required
  if (requireCaptcha) {
    if (!captchaToken || !(await verifyCaptcha(captchaToken))) {
      return {
        allowed: false,
        reason: 'Captcha verification failed',
      };
    }
  }
  
  return { allowed: true };
}


