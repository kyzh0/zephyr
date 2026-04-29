import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AlertRule } from '@/models/notification.model';
import { MAX_ALERT_RULES, nzDateStr } from '@/lib/utils';

interface NotificationStore {
  alertRules: AlertRule[];
  lastResetDate: string | null;
  addRule: (rule: AlertRule) => void;
  updateRule: (id: string, updates: Partial<Omit<AlertRule, 'id'>>) => void;
  removeRule: (id: string) => void;
  enableRule: (id: string) => void;
  disableRule: (id: string) => void;
  disableTriggeredRules: (ruleIds: string[]) => void;
  resetDailyRules: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      alertRules: [],
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
          lastResetDate: nzDateStr()
        });
      }
    }),
    {
      name: 'zephyr-notifications',
      version: 1
    }
  )
);
