import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-6ZC59F952Y';

/**
 * Sends a `page_view` event to Google Analytics on every
 * client-side route change. The initial page load is already
 * tracked by the gtag snippet in index.html, so this only
 * fires on subsequent navigations.
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;

    window.gtag('event', 'page_view', {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
      page_title: document.title,
      send_to: GA_MEASUREMENT_ID
    });
  }, [location]);
}
