import { useEffect } from 'react';

interface TawkToProps {
  propertyId?: string;
  widgetId?: string;
  enabled?: boolean;
}

export default function TawkToWidget({ propertyId, widgetId = 'default', enabled = false }: TawkToProps) {
  useEffect(() => {
    if (!enabled || !propertyId || !propertyId.trim()) {
      return;
    }

    const scriptId = 'tawkto-script';
    if (document.getElementById(scriptId)) {
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    script.src = `https://embed.tawk.to/${encodeURIComponent(propertyId.trim())}/${encodeURIComponent(widgetId.trim())}`;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    document.head.appendChild(script);

    return () => {
      // Clean up script tag on unmount or disable
      const existingScript = document.getElementById(scriptId);
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
      if (typeof window !== 'undefined' && (window as any).Tawk_API?.hideWidget) {
        try {
          (window as any).Tawk_API.hideWidget();
        } catch {}
      }
    };
  }, [propertyId, widgetId, enabled]);

  return null;
}
