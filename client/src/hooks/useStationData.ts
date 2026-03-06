import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatInTimeZone } from 'date-fns-tz';
import { getStationById, loadStationData } from '@/services/station.service';
import { useAppContext } from '@/context/AppContext';
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
  isRefreshing: boolean;
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
  const navigate = useNavigate();
  const { refreshedStations } = useAppContext();

  const [station, setStation] = useState<IStation | null>(null);
  const [allData, setAllData] = useState<ExtendedStationData[]>([]);
  const [allTableData, setAllTableData] = useState<ExtendedStationData[]>([]);
  const [bearingPairCount, setBearingPairCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const initialLoadRef = useRef(true);

  // Filter data based on time range (memoized to prevent re-renders)
  const data = useMemo(() => filterByTimeRange(allData, timeRange), [allData, timeRange]);

  const tableData = useMemo(
    () => filterByTimeRange(allTableData, timeRange),
    [allTableData, timeRange]
  );

  async function fetchData(isRefresh = false) {
    if (!id) return;

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const s = await getStationById(id);
      if (!s) {
        navigate(-1);
        return;
      }
      setStation(s);
      if (s.isOffline) {
        setIsLoading(false);
        return;
      }

      const validBearings: [number, number][] = [];
      const pairs = s.validBearings ? s.validBearings.split(',') : [];
      for (const p of pairs) {
        const temp = p.split('-');
        const b1 = Number(temp[0]);
        const b2 = Number(temp[1]);
        if (b1 <= b2) {
          validBearings.push([b1, b2]);
        } else {
          validBearings.push([b1, 360]);
          validBearings.push([0, b2]);
        }
      }

      const rawData = await loadStationData(id, s.isHighResolution ?? false);
      if (!rawData || !Array.isArray(rawData)) {
        setIsLoading(false);
        return;
      }

      const stationData = rawData as unknown as IStationData[];
      stationData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

      const extendedData: ExtendedStationData[] = stationData.map((d) => {
        const extended: ExtendedStationData = {
          ...d,
          timeLabel: formatInTimeZone(new Date(d.time), 'Pacific/Auckland', 'HH:mm'),
          windAverageKt: d.windAverage == null ? null : Math.round(d.windAverage / 1.852),
          windGustKt: d.windGust == null ? null : Math.round(d.windGust / 1.852)
        };

        if (validBearings.length) {
          setBearingPairCount(validBearings.length);
          validBearings.forEach((vb, i) => {
            extended[`validBearings${i}`] = vb;
          });
        }

        return extended;
      });

      setAllData(extendedData);

      // for non-high-res stations, table data is the same as chart data
      if (!s.isHighResolution) {
        setAllTableData(extendedData);
      }

      // calculate 10 min averages for high-res stations
      if (s.isHighResolution && extendedData.length) {
        const averagedData = calculateHighResAverages(extendedData, id);
        setAllTableData(averagedData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  // initial load
  useEffect(() => {
    if (!id) return;

    initialLoadRef.current = false;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // on refresh trigger (ignore initial load)
  useEffect(() => {
    if (!id || initialLoadRef.current || !refreshedStations?.includes(id)) {
      return;
    }

    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, refreshedStations]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!id || !station || station.isOffline) return;

    const intervalId = setInterval(() => {
      void fetchData(true);
    }, 60 * 1000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, station?.isOffline]);

  return {
    station,
    data,
    tableData,
    bearingPairCount,
    isLoading,
    isRefreshing
  };
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
