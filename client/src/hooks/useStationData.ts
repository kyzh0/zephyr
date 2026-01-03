import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatInTimeZone } from "date-fns-tz";
import { getStationById, loadStationData } from "@/services/station.service";
import { useAppContext } from "@/context/AppContext";
import type { IStation } from "@/models/station.model";
import type { IStationData } from "@/models/station-data.model";
import type { ExtendedStationData } from "@/components/station/types";

export type TimeRange = "3" | "6" | "12" | "24";

interface UseStationDataReturn {
  station: IStation | null;
  data: ExtendedStationData[];
  tableData: ExtendedStationData[];
  bearingPairCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
}

function filterByTimeRange<T extends { time: Date | string }>(
  data: T[],
  hours: TimeRange
): T[] {
  const hoursNum = parseInt(hours, 10);
  const cutoffTime = Date.now() - hoursNum * 60 * 60 * 1000;
  return data.filter((d) => new Date(d.time).getTime() >= cutoffTime);
}

export function useStationData(
  id: string | undefined,
  timeRange: TimeRange = "12"
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
  const data = useMemo(
    () => filterByTimeRange(allData, timeRange),
    [allData, timeRange]
  );

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
      const pairs = s.validBearings ? s.validBearings.split(",") : [];
      for (const p of pairs) {
        const temp = p.split("-");
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
      stationData.sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );

      const extendedData: ExtendedStationData[] = stationData.map((d) => {
        const extended: ExtendedStationData = {
          ...d,
          timeLabel: formatInTimeZone(
            new Date(d.time),
            "Pacific/Auckland",
            "HH:mm"
          ),
          windAverageKt:
            d.windAverage == null ? null : Math.round(d.windAverage / 1.852),
          windGustKt:
            d.windGust == null ? null : Math.round(d.windGust / 1.852),
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
    isRefreshing,
  };
}

/**
 * Calculate 10-minute averages for high-resolution station data
 */
function calculateHighResAverages(
  extendedData: ExtendedStationData[],
  stationId: string
): ExtendedStationData[] {
  let startIdx = 0;
  for (const d of extendedData) {
    if (new Date(d.time).getMinutes() % 10 === 2) {
      break;
    }
    startIdx++;
  }

  if (startIdx >= extendedData.length) return [];

  const result: ExtendedStationData[] = [];
  let sumAvg = 0;
  let sumBearingSin = 0;
  let sumBearingCos = 0;
  let sumTemperature = 0;
  let maxGust: number | null = null;
  let count = 0;
  let intervalStart = new Date(extendedData[startIdx].time);

  for (let i = startIdx; i < extendedData.length; i += 1) {
    const time = new Date(extendedData[i].time);

    if (
      time.getTime() - intervalStart.getTime() >= 10 * 60 * 1000 ||
      (time.getMinutes() % 10 > 0 &&
        time.getMinutes() % 10 < intervalStart.getMinutes() % 10)
    ) {
      const avg = count > 0 ? Math.round(sumAvg / count) : null;
      const calculatedBearing =
        count > 0
          ? Math.round(
              Math.atan2(sumBearingSin, sumBearingCos) / (Math.PI / 180)
            )
          : null;
      const temperature = count > 0 ? Math.round(sumTemperature / count) : null;

      const timeValue = new Date(
        intervalStart.getTime() +
          (10 - (intervalStart.getMinutes() % 10)) * 60 * 1000
      ).toISOString();

      result.push({
        time: new Date(timeValue),
        windAverage: avg ?? undefined,
        windGust: maxGust ?? undefined,
        windBearing:
          calculatedBearing != null
            ? calculatedBearing < 0
              ? calculatedBearing + 360
              : calculatedBearing
            : undefined,
        temperature: temperature ?? undefined,
        _id: stationId,
        timeLabel: formatInTimeZone(
          new Date(timeValue),
          "Pacific/Auckland",
          "HH:mm"
        ),
        windAverageKt: avg == null ? null : Math.round(avg / 1.852),
        windGustKt: maxGust == null ? null : Math.round(maxGust / 1.852),
      });

      intervalStart = time;
      count = 0;
      sumAvg = 0;
      sumBearingSin = 0;
      sumBearingCos = 0;
      sumTemperature = 0;
      maxGust = null;
    }

    if (extendedData[i].windAverage != null) {
      count++;
      sumAvg += extendedData[i].windAverage!;
      if (extendedData[i].windBearing != null) {
        sumBearingSin += Math.sin(
          (extendedData[i].windBearing! * Math.PI) / 180
        );
        sumBearingCos += Math.cos(
          (extendedData[i].windBearing! * Math.PI) / 180
        );
      }
      if (extendedData[i].temperature != null) {
        sumTemperature += extendedData[i].temperature!;
      }
      if (
        extendedData[i].windGust != null &&
        (maxGust === null || extendedData[i].windGust! > maxGust)
      ) {
        maxGust = extendedData[i].windGust!;
      }
    }

    if (time.getMinutes() % 10 === 0) {
      const avg = count > 0 ? Math.round(sumAvg / count) : null;
      const calculatedBearing =
        count > 0
          ? Math.round(
              Math.atan2(sumBearingSin, sumBearingCos) / (Math.PI / 180)
            )
          : null;
      const temperature = count > 0 ? Math.round(sumTemperature / count) : null;

      result.push({
        time: time,
        windAverage: avg ?? undefined,
        windGust: maxGust ?? undefined,
        windBearing:
          calculatedBearing != null
            ? calculatedBearing < 0
              ? calculatedBearing + 360
              : calculatedBearing
            : undefined,
        temperature: temperature ?? undefined,
        _id: stationId,
        timeLabel: formatInTimeZone(time, "Pacific/Auckland", "HH:mm"),
        windAverageKt: avg == null ? null : Math.round(avg / 1.852),
        windGustKt: maxGust == null ? null : Math.round(maxGust / 1.852),
      });

      count = 0;
      sumAvg = 0;
      sumBearingSin = 0;
      sumBearingCos = 0;
      sumTemperature = 0;
      maxGust = null;
      if (i < extendedData.length - 1) {
        intervalStart = new Date(extendedData[i + 1].time);
      }
    }
  }

  return result;
}
