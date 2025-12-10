import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { getStoredHash } from '@/lib/hash';

export function useBanCheck() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip ban check on banned page to prevent infinite redirect
    if (location.pathname === '/banned') {
      setIsChecking(false);
      return;
    }

    const checkBan = async () => {
      try {
        const ipHash = getStoredHash();
        if (!ipHash) {
          setIsChecking(false);
          return;
        }

        const response = await supabase.functions.invoke('check-ban', {
          body: { ip_hash: ipHash },
        });

        if (response.data?.banned) {
          navigate('/banned', { replace: true });
        }
      } catch (error) {
        console.error('Ban check error:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkBan();
  }, [navigate, location.pathname]);

  return { isChecking };
}

