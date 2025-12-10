import { useState, useEffect, useCallback } from 'react';
import { getStoredHash, generateIPHash } from '@/lib/hash';

const COOLDOWN_SECONDS = 10;

export function useRateLimit() {
  const [cooldown, setCooldown] = useState(0);
  const [lastPostTime, setLastPostTime] = useState<number | null>(null);
  
  useEffect(() => {
    // Load last post time from localStorage
    const stored = localStorage.getItem('last_post_time');
    if (stored) {
      const time = parseInt(stored, 10);
      const elapsed = Math.floor((Date.now() - time) / 1000);
      if (elapsed < COOLDOWN_SECONDS) {
        setCooldown(COOLDOWN_SECONDS - elapsed);
        setLastPostTime(time);
      }
    }
  }, []);
  
  useEffect(() => {
    if (cooldown <= 0) return;
    
    const timer = setInterval(() => {
      setCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [cooldown]);
  
  const startCooldown = useCallback(() => {
    const now = Date.now();
    localStorage.setItem('last_post_time', now.toString());
    setLastPostTime(now);
    setCooldown(COOLDOWN_SECONDS);
  }, []);
  
  const canPost = cooldown === 0;
  
  return { canPost, cooldown, startCooldown };
}