import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';
import { REFRESH_INTERVAL_MS } from '@/lib/utils';
import { loadStationData } from '@/services/station.service';
import { ApiError } from '@/services/api-error';
import { useStation } from './useStations';
import type { IStation } from '@/models/station.model';
import type { IStationData } from '@/models/station-data.model';
import type { ExtendedStationData } from '@/components/station/types';

export type TimeRange = '3' | '6' | '12' | '24';

interface UseStationDataReturn {
  station: IStation | null;
  data: ExtendedStationData[];
  tableData: ExtendedStationData[];
  bearingPairCount: number;
  isLoading: boolean;
  error: Error | null;
}

function filterByTimeRange<T extends { time: Date | string }>(data: T[], hours: TimeRange): T[] {
  const hoursNum = parseInt(hours, 10);
  const cutoffTime = Date.now() - hoursNum * 60 * 60 * 1000;
  return data.filter((d) => new Date(d.time).getTime() >= cutoffTime);
}

export function useStationData(
  id: string | undefined,
  timeRange: TimeRange = '12'
): UseStationDataReturn {
  const { station, isLoading: stationLoading, error: stationError } = useStation(id);
  const hr = station?.isHighResolution ?? false;

  const dataQuery = useQuery({
    queryKey: ['station-data', id, hr],
    queryFn: async () => {
      const rawData = await loadStationData(id!, hr);
      const items = Array.isArray(rawData) ? rawData : [];
      return (items as IStationData[]).sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );
    },
    enabled: !!id && !!station && !station.isOffline,
    refetchInterval: REFRESH_INTERVAL_MS,
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2
  });

  const { data, tableData, bearingPairCount } = useMemo(() => {
    if (!id || !station || !dataQuery.data?.length) {
      return {
        data: [] as ExtendedStationData[],
        tableData: [] as ExtendedStationData[],
        bearingPairCount: 0
      };
    }

    // Parse valid bearings
    const validBearings: [number, number][] = [];
    const pairs = station.validBearings ? station.validBearings.split(',') : [];
    for (const p of pairs) {
      const temp = p.split('-');
      const b1 = Number(temp[0]);
      const b2 = Number(temp[1]);
      if (b1 <= b2) validBearings.push([b1, b2]);
      else {
        validBearings.push([b1, 360]);
        validBearings.push([0, b2]);
      }
    }

    const extendedData: ExtendedStationData[] = dataQuery.data.map((d) => {
      const extended: ExtendedStationData = {
        ...d,
        timeLabel: formatInTimeZone(new Date(d.time), 'Pacific/Auckland', 'HH:mm'),
        windAverageKt: d.windAverage == null ? null : Math.round(d.windAverage / 1.852),
        windGustKt: d.windGust == null ? null : Math.round(d.windGust / 1.852)
      };
      validBearings.forEach((vb, i) => {
        extended[`validBearings${i}`] = vb;
      });
      return extended;
    });

    const allTableData = station.isHighResolution
      ? calculateHighResAverages(extendedData, id)
      : padData(extendedData, id);

    return {
      data: filterByTimeRange(extendedData, timeRange),
      tableData: filterByTimeRange(allTableData, timeRange),
      bearingPairCount: validBearings.length
    };
  }, [station, dataQuery.data, timeRange, id]);

  return {
    station,
    data,
    tableData,
    bearingPairCount,
    isLoading: stationLoading || dataQuery.isLoading,
    error: stationError ?? dataQuery.error ?? null
  };
}

/**
 * Pad non-high-res station table data to fill gaps
 */
function padData(extendedData: ExtendedStationData[], stationId: string): ExtendedStationData[] {
  if (extendedData.length === 0) return extendedData;

  const MS_10_MIN = 10 * 60 * 1000;

  const startBucket = Math.floor(new Date(extendedData[0].time).getTime() / MS_10_MIN) * MS_10_MIN;
  const now = Date.now();
  const endBucket = Math.floor(now / MS_10_MIN) * MS_10_MIN;
  // Allow time for fresh data to arrive before padding an empty column at the current interval
  const SCRAPER_GRACE_MS = 120_000;
  const padCutoff = Math.floor((now - SCRAPER_GRACE_MS) / MS_10_MIN) * MS_10_MIN;

  const dataByBucket = new Map<number, ExtendedStationData>();
  for (const item of extendedData) {
    const bucketTime = Math.floor(new Date(item.time).getTime() / MS_10_MIN) * MS_10_MIN;
    dataByBucket.set(bucketTime, item);
  }

  const result: ExtendedStationData[] = [];
  for (let t = startBucket; t <= endBucket; t += MS_10_MIN) {
    if (dataByBucket.has(t)) {
      result.push(dataByBucket.get(t)!);
    } else if (t <= padCutoff) {
      const bucketDate = new Date(t);
      result.push({
        time: bucketDate,
        windAverage: undefined,
        windGust: undefined,
        windBearing: undefined,
        temperature: undefined,
        _id: stationId,
        timeLabel: formatInTimeZone(bucketDate, 'Pacific/Auckland', 'HH:mm'),
        windAverageKt: null,
        windGustKt: null
      });
    }
  }

  return result;
}

/**
 * Calculate 10-minute averages for high-resolution station data
 */
function calculateHighResAverages(
  extendedData: ExtendedStationData[],
  stationId: string
): ExtendedStationData[] {
  if (extendedData.length === 0) return [];

  const MS_10_MIN = 10 * 60 * 1000;

  const firstTime = new Date(extendedData[0].time);
  const lastTime = new Date(extendedData[extendedData.length - 1].time);

  // First bucket boundary
  const firstBucketTime = new Date(Math.ceil(firstTime.getTime() / MS_10_MIN) * MS_10_MIN);

  // Last completed boundary
  const lastCompletedBucketTime = new Date(Math.floor(lastTime.getTime() / MS_10_MIN) * MS_10_MIN);

  // No completed buckets
  if (lastCompletedBucketTime < firstBucketTime) {
    return [];
  }

  const buckets = new Map<number, ExtendedStationData[]>();

  // Pre-create buckets
  for (let t = firstBucketTime.getTime(); t <= lastCompletedBucketTime.getTime(); t += MS_10_MIN) {
    buckets.set(t, []);
  }

  // Assign samples to buckets
  for (const row of extendedData) {
    const sampleTime = new Date(row.time).getTime();
    const bucketTime = Math.ceil(sampleTime / MS_10_MIN) * MS_10_MIN;

    // Only assign if bucket is completed
    if (bucketTime <= lastCompletedBucketTime.getTime()) {
      if (buckets.has(bucketTime)) {
        buckets.get(bucketTime)!.push(row);
      }
    }
  }

  const result: ExtendedStationData[] = [];

  for (const [bucketTime, rows] of buckets) {
    let sumAvg = 0;
    let countAvg = 0;

    let sumTemp = 0;
    let countTemp = 0;

    let sumSin = 0;
    let sumCos = 0;
    let countBearing = 0;

    let maxGust: number | null = null;

    for (const r of rows) {
      if (r.windAverage != null) {
        sumAvg += r.windAverage;
        countAvg++;
      }

      if (r.windBearing != null) {
        sumSin += Math.sin((r.windBearing * Math.PI) / 180);
        sumCos += Math.cos((r.windBearing * Math.PI) / 180);
        countBearing++;
      }

      if (r.temperature != null) {
        sumTemp += r.temperature;
        countTemp++;
      }

      if (r.windGust != null) {
        maxGust = Math.max(maxGust ?? 0, r.windGust);
      }
    }

    const avg = countAvg > 0 ? Math.round(sumAvg / countAvg) : null;

    const temperature = countTemp > 0 ? Math.round(sumTemp / countTemp) : null;

    const bearing =
      countBearing > 0
        ? (() => {
            const deg = Math.round(Math.atan2(sumSin, sumCos) * (180 / Math.PI));
            return deg < 0 ? deg + 360 : deg;
          })()
        : null;

    const bucketDate = new Date(bucketTime);

    result.push({
      time: bucketDate,
      windAverage: avg ?? undefined,
      windGust: maxGust ?? undefined,
      windBearing: bearing ?? undefined,
      temperature: temperature ?? undefined,
      _id: stationId,
      timeLabel: formatInTimeZone(bucketDate, 'Pacific/Auckland', 'HH:mm'),
      windAverageKt: avg == null ? null : Math.round(avg / 1.852),
      windGustKt: maxGust == null ? null : Math.round(maxGust / 1.852)
    });
  }

  return result;
}
