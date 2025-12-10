import { useRef, useEffect } from 'react';

interface CaptchaProps {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    hcaptcha: {
      render: (container: HTMLElement, options: {
        sitekey: string;
        callback: (token: string) => void;
        'error-callback': () => void;
        'expired-callback': () => void;
      }) => string;
      reset: (widgetId: string) => void;
      execute: (widgetId: string) => void;
    };
  }
}

export function Captcha({ siteKey, onVerify, onExpire, onError }: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !siteKey) return;

    const loadCaptcha = () => {
      if (window.hcaptcha && containerRef.current) {
        try {
          widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
            sitekey: siteKey,
            callback: (token: string) => {
              onVerify(token);
            },
            'error-callback': () => {
              onError?.();
            },
            'expired-callback': () => {
              onExpire?.();
            },
          });
        } catch (error) {
          console.error('Captcha render error:', error);
        }
      }
    };

    if (window.hcaptcha) {
      loadCaptcha();
    } else {
      const checkInterval = setInterval(() => {
        if (window.hcaptcha) {
          clearInterval(checkInterval);
          loadCaptcha();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
      }, 10000);
    }

    return () => {
      if (widgetIdRef.current && window.hcaptcha) {
        try {
          const widget = document.querySelector(`[data-hcaptcha-widget-id="${widgetIdRef.current}"]`);
          if (widget) {
            widget.remove();
          }
        } catch (error) {
          console.error('Captcha cleanup error:', error);
        }
      }
    };
  }, [siteKey, onVerify, onExpire, onError]);

  const reset = () => {
    if (widgetIdRef.current && window.hcaptcha) {
      window.hcaptcha.reset(widgetIdRef.current);
    }
  };

  return (
    <div>
      <div ref={containerRef} className="captcha-container" />
    </div>
  );
}

export function resetCaptcha(widgetId: string | null) {
  if (widgetId && window.hcaptcha) {
    window.hcaptcha.reset(widgetId);
  }
}


