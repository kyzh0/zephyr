import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Plus,
  Pencil,
  Trash2,
  Smartphone,
  ArrowUpFromLine,
  ArrowDownFromLine
} from 'lucide-react';
import { toast } from 'sonner';

import { useNotificationStore, useMapStore } from '@/store';
import { useStations } from '@/hooks/useStations';
import { MAX_ALERT_RULES, nzDateStr } from '@/lib/utils';
import { subscribePush, syncSubscription, getPushSubscription } from '@/services/push.service';
import type { AlertRule, BoundType, WindDirection } from '@/models/notification.model';
import {
  IDB_NOTIFICATIONS_NAME,
  IDB_NOTIFICATIONS_STORE,
  SW_MSG,
  type SWMessage
} from '@/lib/sw-protocol';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const WIND_DIRECTIONS: WindDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function kmhToDisplay(kmh: number, unit: 'kmh' | 'kt'): number {
  return unit === 'kt' ? Math.round(kmh / 1.852) : kmh;
}

function displayToKmh(value: number, unit: 'kmh' | 'kt'): number {
  return unit === 'kt' ? Math.round(value * 1.852) : value;
}

function unitLabel(unit: 'kmh' | 'kt'): string {
  return unit === 'kt' ? 'kt' : 'km/h';
}

function isAnyDirection(directions: WindDirection[]): boolean {
  return directions.length === 0 || directions.length === WIND_DIRECTIONS.length;
}

async function getAndClearTriggeredRuleIds(): Promise<string[]> {
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_NOTIFICATIONS_NAME, 1);
    req.onupgradeneeded = (e) => {
      (e.target as IDBOpenDBRequest).result.createObjectStore(IDB_NOTIFICATIONS_STORE);
    };
    req.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      const tx = db.transaction(IDB_NOTIFICATIONS_STORE, 'readwrite');
      const store = tx.objectStore(IDB_NOTIFICATIONS_STORE);
      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        const keys = keysReq.result as string[];
        keys.forEach((k) => store.delete(k));
        tx.oncomplete = () => {
          db.close();
          resolve(keys);
        };
        tx.onerror = () => {
          db.close();
          resolve([]);
        };
      };
      keysReq.onerror = () => {
        db.close();
        resolve([]);
      };
    };
    req.onerror = () => resolve([]);
  });
}

// ─── Alert Rule Card ──────────────────────────────────────────────────────────

function AlertRuleCard({
  rule,
  unit,
  onEnable,
  onDisable,
  onEdit,
  onDelete
}: {
  rule: AlertRule;
  unit: 'kmh' | 'kt';
  onEnable: () => void;
  onDisable: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isActive = rule.enabled;

  const thresholdDisplay = `${kmhToDisplay(rule.threshold, unit)} ${unitLabel(unit)}`;

  return (
    <Card className={`py-3 ${!isActive ? 'opacity-60' : ''}`}>
      <CardContent className="px-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-sm truncate flex-1">
            {rule.stationName.length > 30 ? rule.stationName.slice(0, 30) + '…' : rule.stationName}
          </span>
          <div className="flex items-center shrink-0">
            <Button variant="ghost" size="sm" className="h-7 cursor-pointer" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Switch
              className="ml-4"
              checked={isActive}
              onCheckedChange={(checked) => (checked ? onEnable() : onDisable())}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {rule.boundType === 'above' ? (
            <ArrowUpFromLine className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ArrowDownFromLine className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>{thresholdDisplay}</span>
          <div className="flex flex-wrap gap-1">
            {isAnyDirection(rule.directions) ? (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                Any direction
              </Badge>
            ) : (
              rule.directions.map((d) => (
                <Badge key={d} variant="secondary" className="text-xs px-1.5 py-0">
                  {d}
                </Badge>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Add / Edit Dialog ────────────────────────────────────────────────────────

interface RuleFormState {
  stationId: string;
  stationName: string;
  thresholdDisplay: string;
  boundType: BoundType;
  directions: WindDirection[];
}

function RuleDialog({
  open,
  rule,
  unit,
  onSave,
  onClose
}: {
  open: boolean;
  rule: AlertRule | null;
  unit: 'kmh' | 'kt';
  onSave: (data: Omit<AlertRule, 'id' | 'enabled'>) => void;
  onClose: () => void;
}) {
  const { stations } = useStations();
  const [showStationList, setShowStationList] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  const [stationSearch, setStationSearch] = useState(() => rule?.stationName ?? '');
  const [errors, setErrors] = useState<{ station?: boolean; threshold?: boolean }>({});

  const [form, setForm] = useState<RuleFormState>(() =>
    rule
      ? {
          stationId: rule.stationId,
          stationName: rule.stationName,
          thresholdDisplay: String(kmhToDisplay(rule.threshold, unit)),
          boundType: rule.boundType,
          directions: rule.directions
        }
      : {
          stationId: '',
          stationName: '',
          thresholdDisplay: '20',
          boundType: 'above',
          directions: []
        }
  );

  useEffect(() => {
    if (!showStationList) return;
    const handler = (e: PointerEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setShowStationList(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [showStationList]);

  const filteredStations = stationSearch.trim()
    ? stations
        .filter((s) => s.name.toLowerCase().includes(stationSearch.toLowerCase()))
        .slice(0, 12)
    : [];

  function toggleDirection(dir: WindDirection) {
    setForm((prev) => {
      const next = prev.directions.includes(dir)
        ? prev.directions.filter((d) => d !== dir)
        : [...prev.directions, dir];
      return { ...prev, directions: next };
    });
  }

  function handleSubmit() {
    const threshold = parseInt(form.thresholdDisplay, 10);
    const stationInvalid = !form.stationId;
    const thresholdInvalid = !form.thresholdDisplay.trim() || isNaN(threshold) || threshold <= 0;
    if (stationInvalid || thresholdInvalid) {
      setErrors({ station: stationInvalid, threshold: thresholdInvalid });
      if (stationInvalid) toast.error('Please select a station');
      else toast.error('Please enter a valid threshold');
      return;
    }
    onSave({
      stationId: form.stationId,
      stationName: form.stationName,
      threshold: displayToKmh(threshold, unit),
      boundType: form.boundType,
      directions: form.directions
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Alert' : 'Add Alert'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Station picker */}
          <div className="flex flex-col gap-1.5">
            <Label>Station</Label>
            <div ref={comboRef} className="relative">
              <Input
                placeholder="Search stations..."
                value={stationSearch}
                aria-invalid={errors.station}
                onChange={(e) => {
                  setStationSearch(e.target.value);
                  setShowStationList(true);
                  setErrors((prev) => ({ ...prev, station: false }));
                  setForm((prev) => ({ ...prev, stationId: '', stationName: '' }));
                }}
                onFocus={() => setShowStationList(true)}
                autoComplete="off"
              />
              {showStationList && filteredStations.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-52 overflow-y-auto">
                  {filteredStations.map((s) => (
                    <button
                      key={s._id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          stationId: s._id,
                          stationName: s.name
                        }));
                        setStationSearch(s.name);
                        setShowStationList(false);
                      }}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Threshold */}
          <div className="flex flex-col gap-1.5">
            <Label>Wind average speed threshold</Label>
            <div className="flex gap-2 items-center">
              <Tabs
                value={form.boundType}
                onValueChange={(v) => setForm((prev) => ({ ...prev, boundType: v as BoundType }))}
                className="shrink-0"
              >
                <TabsList className="h-9">
                  <TabsTrigger value="above" className="h-8 text-xs gap-1">
                    <ArrowUpFromLine className="h-3 w-3" /> Above
                  </TabsTrigger>
                  <TabsTrigger value="below" className="h-8 text-xs gap-1">
                    <ArrowDownFromLine className="h-3 w-3" /> Below
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1.5 flex-1">
                <Input
                  type="number"
                  min={1}
                  max={999}
                  value={form.thresholdDisplay}
                  aria-invalid={errors.threshold}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, thresholdDisplay: e.target.value }));
                    setErrors((prev) => ({ ...prev, threshold: false }));
                  }}
                  className="h-9"
                />
                <span className="text-sm text-muted-foreground shrink-0">{unitLabel(unit)}</span>
              </div>
            </div>
          </div>

          {/* Wind direction */}
          <div className="flex flex-col gap-1.5">
            <Label>Wind direction</Label>
            <p className="text-xs text-muted-foreground mb-1">Select none for any direction.</p>
            <div className="grid grid-cols-4 gap-1.5">
              {WIND_DIRECTIONS.map((dir) => (
                <Toggle
                  key={dir}
                  variant="outline"
                  size="sm"
                  pressed={form.directions.includes(dir)}
                  onPressedChange={() => toggleDirection(dir)}
                  className="h-9 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {dir}
                </Toggle>
              ))}
            </div>
          </div>

          <Separator />

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{rule ? 'Save changes' : 'Add alert'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const navigate = useNavigate();
  const unit = useMapStore((s) => s.unit);

  const alertRules = useNotificationStore((s) => s.alertRules);
  const addRule = useNotificationStore((s) => s.addRule);
  const updateRule = useNotificationStore((s) => s.updateRule);
  const removeRule = useNotificationStore((s) => s.removeRule);
  const enableRule = useNotificationStore((s) => s.enableRule);
  const disableRule = useNotificationStore((s) => s.disableRule);
  const disableTriggeredRules = useNotificationStore((s) => s.disableTriggeredRules);
  const resetDailyRules = useNotificationStore((s) => s.resetDailyRules);

  const [hasHydrated, setHasHydrated] = useState(() => useNotificationStore.persist.hasHydrated());

  const isStandalone =
    typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [addEditOpen, setAddEditOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  async function doSync(rules: AlertRule[]) {
    try {
      const sub = await getPushSubscription();
      if (!sub) {
        toast.error('Error - Reset notification permissions in browser settings');
        return;
      }
      await syncSubscription(sub, rules, unit);
    } catch {
      toast.error('Something went wrong. Refresh and try again.');
    }
  }

  // On mount: read IndexedDB for triggered rules + listen for SW postMessages
  useEffect(() => {
    getAndClearTriggeredRuleIds().then((ids) => {
      if (ids.length > 0) disableTriggeredRules(ids);
    });

    const handler = (event: MessageEvent<SWMessage>) => {
      if (event.data?.type === SW_MSG.RULE_TRIGGERED && event.data.ruleIds?.length) {
        disableTriggeredRules(event.data.ruleIds);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [disableTriggeredRules]);

  // Wait for persisted state to rehydrate before reading alertRules
  useEffect(() => {
    if (hasHydrated) return;
    return useNotificationStore.persist.onFinishHydration(() => setHasHydrated(true));
  }, [hasHydrated]);

  // Watch for browser-side permission changes
  useEffect(() => {
    if (!('permissions' in navigator)) return;

    let status: PermissionStatus | null = null;
    let cancelled = false;
    const handler = () => {
      if (status) setPermission(status.state === 'prompt' ? 'default' : status.state);
    };

    navigator.permissions.query({ name: 'notifications' }).then((s) => {
      if (cancelled) return;
      status = s;
      handler();
      status.addEventListener('change', handler);
    });

    return () => {
      cancelled = true;
      status?.removeEventListener('change', handler);
    };
  }, []);

  // Disable all rules if new day
  useEffect(() => {
    if (!hasHydrated) return;
    if (useNotificationStore.getState().lastResetDate === nzDateStr()) return;

    const hadEnabled = useNotificationStore.getState().alertRules.some((r) => r.enabled);
    resetDailyRules();
    if (hadEnabled) doSync([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]);

  async function handleEnablePermission() {
    if (!('Notification' in window)) return;
    setIsSubscribing(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return;

      await subscribePush(
        alertRules.filter((r) => r.enabled),
        unit
      );
      toast.success('Notifications enabled');
    } catch {
      toast.error('Failed to enable notifications');
    } finally {
      setIsSubscribing(false);
    }
  }

  function handleSave(data: Omit<AlertRule, 'id' | 'enabled'>) {
    const normalised: Omit<AlertRule, 'id' | 'enabled'> = {
      ...data,
      directions: data.directions.length === WIND_DIRECTIONS.length ? [] : data.directions
    };
    if (editingRule) {
      updateRule(editingRule.id, normalised);
      enableRule(editingRule.id);
      toast.success('Alert updated');
      const updated = useNotificationStore.getState().alertRules;
      doSync(updated.filter((r) => r.enabled));
    } else {
      const sortedDirs = [...normalised.directions].sort();
      const currentRules = useNotificationStore.getState().alertRules;
      const duplicate = currentRules.find(
        (r) =>
          r.stationId === normalised.stationId &&
          r.threshold === normalised.threshold &&
          r.boundType === normalised.boundType &&
          [...r.directions].sort().join() === sortedDirs.join()
      );
      if (duplicate) {
        enableRule(duplicate.id);
        toast.success('Alert updated');
        const updated = useNotificationStore.getState().alertRules;
        doSync(updated.filter((r) => r.enabled));
      } else {
        const newRule: AlertRule = { ...normalised, id: crypto.randomUUID(), enabled: true };
        addRule(newRule);
        toast.success('Alert added');
        const updated = useNotificationStore.getState().alertRules;
        doSync(updated.filter((r) => r.enabled));
      }
    }
    setAddEditOpen(false);
    setEditingRule(null);
  }

  function handleEnable(id: string) {
    enableRule(id);
    const updated = useNotificationStore.getState().alertRules;
    doSync(updated.filter((r) => r.enabled));
  }

  function handleDisable(id: string) {
    disableRule(id);
    const updated = useNotificationStore.getState().alertRules;
    doSync(updated.filter((r) => r.enabled));
  }

  function handleDelete(id: string) {
    removeRule(id);
    const updated = useNotificationStore.getState().alertRules;
    doSync(updated.filter((r) => r.enabled));
    toast.success('Alert deleted');
    setDeleteConfirmId(null);
  }

  const ruleToDelete = alertRules.find((r) => r.id === deleteConfirmId);

  return (
    <>
      <Dialog open onOpenChange={() => navigate('/')}>
        <DialogContent
          className="md:max-w-4xl sm:max-w-2xl max-h-[85vh] overflow-y-auto pb-4 focus:outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Wind Alerts</DialogTitle>
            <DialogDescription>Get notified when conditions match your criteria.</DialogDescription>
            <DialogDescription className="text-xs">
              Alerts disable automatically at midnight, or when triggered.
            </DialogDescription>
          </DialogHeader>

          {/* Install required banner */}
          {!isStandalone && (
            <Alert className="flex items-center">
              <Smartphone className="h-8! w-8! mr-2" />
              <AlertDescription className="text-sm">
                <div className="flex flex-col">
                  <span>Install Zephyr as an app to use alerts.</span>
                  <span>Chrome: tap ⋮ → Add to Home Screen</span>
                  <span>Safari: tap Share → Add to Home Screen</span>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Gated content */}
          <div className={!isStandalone ? 'opacity-40 pointer-events-none select-none' : ''}>
            {/* Permission: denied */}
            {isStandalone && permission === 'denied' && (
              <Alert variant="destructive">
                <BellOff className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Notifications are blocked. To re-enable, go to your browser settings and allow
                  notifications for this site.
                </AlertDescription>
              </Alert>
            )}

            {/* Permission: default (not yet asked) */}
            {isStandalone && permission === 'default' && (
              <div className="flex flex-col gap-2 py-1">
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Enable notifications so Zephyr can alert you when your conditions are met.
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleEnablePermission}
                  disabled={isSubscribing}
                  className="w-full"
                >
                  {isSubscribing ? 'Enabling…' : 'Enable Notifications'}
                </Button>
              </div>
            )}

            <Separator className="my-3" />

            {/* Rule count header */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">
                {alertRules.length} / {MAX_ALERT_RULES} alerts
              </span>
              <Button
                size="sm"
                disabled={alertRules.length >= MAX_ALERT_RULES}
                onClick={() => {
                  setEditingRule(null);
                  setAddEditOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add alert
              </Button>
            </div>

            {/* Empty state */}
            {alertRules.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">No alerts configured.</p>
              </div>
            )}

            {/* Rule list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alertRules.map((rule) => (
                <AlertRuleCard
                  key={rule.id}
                  rule={rule}
                  unit={unit}
                  onEnable={() => handleEnable(rule.id)}
                  onDisable={() => handleDisable(rule.id)}
                  onEdit={() => {
                    setEditingRule(rule);
                    setAddEditOpen(true);
                  }}
                  onDelete={() => setDeleteConfirmId(rule.id)}
                />
              ))}
            </div>
          </div>

          {/* Add / Edit rule dialog */}
          <RuleDialog
            key={`${editingRule?.id ?? 'new'}-${addEditOpen}`}
            open={addEditOpen}
            rule={editingRule}
            unit={unit}
            onSave={handleSave}
            onClose={() => {
              setAddEditOpen(false);
              setEditingRule(null);
            }}
          />

          {/* Delete confirmation */}
          <AlertDialog
            open={deleteConfirmId !== null}
            onOpenChange={(o) => !o && setDeleteConfirmId(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete alert?</AlertDialogTitle>
                <AlertDialogDescription>
                  {ruleToDelete
                    ? `Remove the alert for "${ruleToDelete.stationName}"? This cannot be undone.`
                    : 'Remove this alert?'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row gap-2">
                <AlertDialogCancel className="flex-1 mt-0 cursor-pointer">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="flex-1 bg-destructive text-white cursor-pointer hover:bg-destructive/90"
                  onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DialogContent>
      </Dialog>
    </>
  );
}
