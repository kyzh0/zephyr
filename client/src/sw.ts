/// <reference lib="WebWorker" />
import { precacheAndRoute, matchPrecache } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

import {
  IDB_NOTIFICATIONS_NAME,
  IDB_NOTIFICATIONS_STORE,
  SW_MSG,
  type SWMessage
} from '@/lib/sw-protocol';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[];
};

precacheAndRoute(self.__WB_MANIFEST);

// SPA shell fallback
registerRoute(
  new NavigationRoute(async () => (await matchPrecache('/index.html')) ?? fetch('/index.html'))
);

// Station list
registerRoute(
  ({ url }) => /^https:\/\/api(\.test)?\.zephyrapp\.nz\/stations(\?.*)?$/.test(url.href),
  new NetworkFirst({
    cacheName: 'station-list',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 3600 }),
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

// Station detail / data
registerRoute(
  ({ url }) => /^https:\/\/api(\.test)?\.zephyrapp\.nz\/stations\/.+/.test(url.href),
  new NetworkFirst({
    cacheName: 'station-data',
    plugins: [
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 3600 }),
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

// Webcam list
registerRoute(
  ({ url }) => /^https:\/\/api(\.test)?\.zephyrapp\.nz\/webcams(\?.*)?$/.test(url.href),
  new NetworkFirst({
    cacheName: 'webcam-list',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 3600 }),
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

// Webcam detail
registerRoute(
  ({ url }) => /^https:\/\/api(\.test)?\.zephyrapp\.nz\/webcams\/.+/.test(url.href),
  new NetworkFirst({
    cacheName: 'webcam-data',
    plugins: [
      new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 3600 }),
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

// Webcam images from file server
registerRoute(
  ({ url }) => /^https:\/\/fs(\.test)?\.zephyrapp\.nz\/.+/.test(url.href),
  new NetworkFirst({
    cacheName: 'webcam-images',
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 3600 }),
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

// Sites
registerRoute(
  ({ url }) => /^https:\/\/api(\.test)?\.zephyrapp\.nz\/sites(\?.*)?$/.test(url.href),
  new StaleWhileRevalidate({
    cacheName: 'site-list',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 3600 }),
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

// Site detail
registerRoute(
  ({ url }) => /^https:\/\/api(\.test)?\.zephyrapp\.nz\/sites\/.+/.test(url.href),
  new StaleWhileRevalidate({
    cacheName: 'site-data',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 3600 }),
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

// Landings
registerRoute(
  ({ url }) => /^https:\/\/api(\.test)?\.zephyrapp\.nz\/landings(\?.*)?$/.test(url.href),
  new StaleWhileRevalidate({
    cacheName: 'landing-list',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 3600 }),
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

// Landing detail
registerRoute(
  ({ url }) => /^https:\/\/api(\.test)?\.zephyrapp\.nz\/landings\/.+/.test(url.href),
  new StaleWhileRevalidate({
    cacheName: 'landing-data',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 3600 }),
      new CacheableResponsePlugin({ statuses: [200] })
    ]
  })
);

// Push notifications

function openTriggeredDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NOTIFICATIONS_NAME, 1);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(IDB_NOTIFICATIONS_STORE);
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
  });
}

async function markRuleTriggered(ruleId: string): Promise<void> {
  const db = await openTriggeredDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_NOTIFICATIONS_STORE, 'readwrite');
    tx.objectStore(IDB_NOTIFICATIONS_STORE).put(Date.now(), ruleId);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error('IDB transaction failed'));
    };
  });
}

interface PushPayload {
  title: string;
  body: string;
  ruleIds: string[];
  stationId: string;
  url: string;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  event.waitUntil(
    (async () => {
      let data: PushPayload;
      try {
        data = event.data!.json() as PushPayload;
      } catch {
        return;
      }

      for (const ruleId of data.ruleIds) {
        await markRuleTriggered(ruleId);
      }

      // Notify any open app windows to disable the rules immediately
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const msg: SWMessage = { type: SW_MSG.RULE_TRIGGERED, ruleIds: data.ruleIds };
      for (const client of clients) {
        client.postMessage(msg);
      }

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/logo192.png',
        badge: '/badge.svg',
        tag: data.stationId,
        data: { stationId: data.stationId, url: data.url }
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url: string = (event.notification.data as { stationId: string; url: string }).url;

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clients.find((c) => {
        try {
          return new URL(c.url).pathname === url;
        } catch {
          return false;
        }
      });
      if (existing) {
        await existing.focus();
        const msg: SWMessage = { type: SW_MSG.NAVIGATE, url };
        existing.postMessage(msg);
      } else {
        await self.clients.openWindow(url);
      }
    })()
  );
});
