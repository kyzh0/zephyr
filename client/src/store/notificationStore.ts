import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AlertRule } from '@/models/notification.model';

export const MAX_ALERT_RULES = 10;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

interface NotificationStore {
  alertRules: AlertRule[];
  lastSynced: number | null;
  lastResetDate: number | null;
  addRule: (rule: AlertRule) => void;
  updateRule: (id: string, updates: Partial<Omit<AlertRule, 'id'>>) => void;
  removeRule: (id: string) => void;
  enableRule: (id: string) => void;
  disableRule: (id: string) => void;
  disableTriggeredRules: (ruleIds: string[]) => void;
  resetDailyRules: () => void;
  setLastSynced: (ts: number) => void;
  shouldSyncOnLoad: () => boolean;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      alertRules: [],
      lastSynced: null,
      lastResetDate: null,

      addRule: (rule) => {
        const rules = get().alertRules;
        if (rules.length >= MAX_ALERT_RULES) return;
        set({ alertRules: [...rules, rule] });
      },

      updateRule: (id, updates) => {
        set({
          alertRules: get().alertRules.map((r) => (r.id === id ? { ...r, ...updates } : r))
        });
      },

      removeRule: (id) => {
        set({ alertRules: get().alertRules.filter((r) => r.id !== id) });
      },

      enableRule: (id) => {
        set({
          alertRules: get().alertRules.map((r) => (r.id === id ? { ...r, enabled: true } : r))
        });
      },

      disableRule: (id) => {
        set({
          alertRules: get().alertRules.map((r) => (r.id === id ? { ...r, enabled: false } : r))
        });
      },

      disableTriggeredRules: (ruleIds) => {
        if (!ruleIds.length) return;
        set({
          alertRules: get().alertRules.map((r) =>
            ruleIds.includes(r.id) ? { ...r, enabled: false } : r
          )
        });
      },

      resetDailyRules: () => {
        set({
          alertRules: get().alertRules.map((r) => ({ ...r, enabled: false })),
          lastResetDate: startOfToday()
        });
      },

      setLastSynced: (ts) => set({ lastSynced: ts }),

      shouldSyncOnLoad: () => {
        const { alertRules, lastSynced } = get();
        if (!alertRules.some((r) => r.enabled)) return false;
        if (lastSynced == null) return true;
        return Date.now() - lastSynced > SYNC_INTERVAL_MS;
      }
    }),
    {
      name: 'zephyr-notifications',
      version: 1
    }
  )
);
