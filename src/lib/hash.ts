// Simple hash function for IP anonymization (client-side)
export async function generateIPHash(): Promise<string> {
  // Generate a pseudo-random hash based on browser fingerprint
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width,
    screen.height,
    navigator.hardwareConcurrency || 0,
  ].join('|');
  
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint + Date.now().toString());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Store the hash in localStorage for consistency
  const storedHash = localStorage.getItem('anon_hash');
  if (storedHash) {
    return storedHash;
  }
  
  localStorage.setItem('anon_hash', hashHex.substring(0, 16));
  return hashHex.substring(0, 16);
}

export function getStoredHash(): string {
  return localStorage.getItem('anon_hash') || '';
}