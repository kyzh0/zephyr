import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AlertRule } from '@/models/notification.model';

export const MAX_ALERT_RULES = 10;
const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface NotificationStore {
  alertRules: AlertRule[];
  lastSynced: number | null;
  addRule: (rule: AlertRule) => void;
  updateRule: (id: string, updates: Partial<Omit<AlertRule, 'id'>>) => void;
  removeRule: (id: string) => void;
  enableRule: (id: string, enabledAt: number) => void;
  disableRule: (id: string) => void;
  disableTriggeredRules: (ruleIds: string[]) => void;
  setLastSynced: (ts: number) => void;
  shouldSyncOnLoad: () => boolean;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      alertRules: [],
      lastSynced: null,

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

      enableRule: (id, enabledAt) => {
        set({
          alertRules: get().alertRules.map((r) =>
            r.id === id ? { ...r, enabled: true, enabledAt } : r
          )
        });
      },

      disableRule: (id) => {
        set({
          alertRules: get().alertRules.map((r) =>
            r.id === id ? { ...r, enabled: false, enabledAt: null } : r
          )
        });
      },

      disableTriggeredRules: (ruleIds) => {
        if (!ruleIds.length) return;
        set({
          alertRules: get().alertRules.map((r) =>
            ruleIds.includes(r.id) ? { ...r, enabled: false, enabledAt: null } : r
          )
        });
      },

      setLastSynced: (ts) => set({ lastSynced: ts }),

      shouldSyncOnLoad: () => {
        const { alertRules, lastSynced } = get();
        const now = Date.now();
        const hasEnabled = alertRules.some(
          (r) => r.enabled && r.enabledAt != null && r.enabledAt + r.activeHours * 3_600_000 > now
        );
        if (!hasEnabled) return false;
        if (lastSynced == null) return true;
        return now - lastSynced > SYNC_INTERVAL_MS;
      }
    }),
    {
      name: 'zephyr-notifications',
      version: 1,
      onRehydrateStorage: () => (hydratedState, error) => {
        if (error || !hydratedState) return;

        const now = Date.now();
        const expired = hydratedState.alertRules.filter(
          (r) => r.enabled && r.enabledAt != null && r.enabledAt + r.activeHours * 3_600_000 <= now
        );
        if (expired.length > 0) {
          const expiredIds = new Set(expired.map((r) => r.id));
          useNotificationStore.setState({
            alertRules: hydratedState.alertRules.map((r) =>
              expiredIds.has(r.id) ? { ...r, enabled: false, enabledAt: null } : r
            )
          });
        }
      }
    }
  )
);
