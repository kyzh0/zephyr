export const IDB_NOTIFICATIONS_NAME = 'zephyr-notifications-sw';
export const IDB_NOTIFICATIONS_STORE = 'triggered';

export const SW_MSG = {
  RULE_TRIGGERED: 'RULE_TRIGGERED',
  NAVIGATE: 'NAVIGATE'
} as const;

export type SWMessage =
  | { type: typeof SW_MSG.RULE_TRIGGERED; ruleId: string }
  | { type: typeof SW_MSG.NAVIGATE; url: string };
