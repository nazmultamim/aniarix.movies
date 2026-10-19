'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    if (process.env.NODE_ENV !== 'production') {
      // Dev builds should not keep an old service worker around, because it can
      // serve stale client chunks and break hot-reloaded modules.
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });

      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys
            .filter((key) => key.startsWith('shell-') || key.startsWith('runtime-'))
            .forEach((key) => caches.delete(key));
        });
      }

      return undefined;
    }

    let cancelled = false;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
      } catch (error) {
        if (!cancelled) {
          console.warn('[PWA] Service worker registration failed:', error);
        }
      }
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener('load', register);
    };
  }, []);

  return null;
}
