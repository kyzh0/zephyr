export type WindDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export type BoundType = 'above' | 'below';

export interface AlertRule {
  id: string;
  stationId: string;
  stationName: string;
  threshold: number;
  boundType: BoundType;
  directions: WindDirection[];
  activeHours: number;
  enabledAt: number | null;
  enabled: boolean;
}
