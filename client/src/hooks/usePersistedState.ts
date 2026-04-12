import { useCallback, useRef, useSyncExternalStore } from 'react';

import { getStoredValue, setStoredValue } from '@/components/map/map.utils';

// State that automatically syncs with localStorage via useSyncExternalStore

const listeners = new Map<string, Set<() => void>>();
const cache = new Map<string, unknown>();

function subscribe(key: string, callback: () => void) {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(callback);
  return () => {
    set.delete(callback);
    if (set.size === 0) {
      listeners.delete(key);
      cache.delete(key);
    }
  };
}

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn());
}

function readValue<T>(key: string, defaultValue: T): T {
  if (cache.has(key)) return cache.get(key) as T;
  const value = getStoredValue(key, defaultValue);
  cache.set(key, value);
  return value;
}

function writeValue<T>(key: string, value: T) {
  try {
    setStoredValue(key, value);
  } catch {
    // localStorage may be full or unavailable
  }
  cache.set(key, value);
  notify(key);
}

export function usePersistedState<T>(key: string, defaultValue: T) {
  const defaultRef = useRef(defaultValue);

  const sub = useCallback((cb: () => void) => subscribe(key, cb), [key]);

  const value = useSyncExternalStore(
    sub,
    () => readValue(key, defaultRef.current),
    () => defaultRef.current
  );

  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const current = readValue(key, defaultRef.current);
      const resolved =
        typeof newValue === 'function' ? (newValue as (prev: T) => T)(current) : newValue;
      writeValue(key, resolved);
    },
    [key]
  );

  return [value, setValue] as const;
}
