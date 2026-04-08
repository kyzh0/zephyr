import { cn, getTextColor, getWindColorForSport, getWindDirectionFromBearing } from '@/lib/utils';
import { usePersistedState } from '@/hooks';
import { getDirectionColor, convertWindSpeed } from './utils';
import type { WindUnit } from './types';
import { useAppContext } from '@/context/AppContext';
import { DirectionArrow } from '@/components/ui/DirectionArrow';
import type { ExtendedStationData } from './types';

interface StationDataTableProps {
  tableData: ExtendedStationData[];
  validBearings: string | undefined;
}

export const StationDataTable = function StationDataTable({
  ref,
  tableData,
  validBearings
}: StationDataTableProps & {
  ref?: React.RefObject<HTMLTableRowElement | null>;
}) {
  const [unit] = usePersistedState<WindUnit>('unit', 'kmh');
  const { sport } = useAppContext();

  return (
    <div className="overflow-x-auto rounded-lg border bg-white mt-2 mb-4 sm:min-h-0">
      <table className="text-sm">
        <tbody>
          {/* Time row */}
          <tr ref={ref}>
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className={cn(
                  'text-center text-muted-foreground px-0.5 py-0 sm:p-0.5 text-xs sm:text-sm',
                  new Date(d.time).getMinutes() === 0 && 'bg-gray-300 text-color-base'
                )}
              >
                {d.timeLabel}
              </td>
            ))}
          </tr>

          {/* Average row */}
          <tr>
            {tableData.map((d) => {
              const windColor = getWindColorForSport(d.windAverage ?? null, sport);
              return (
                <td
                  key={String(d.time)}
                  className="text-center text-xs sm:text-sm p-0 sm:p-0.5"
                  style={{
                    backgroundColor: windColor,
                    color: getTextColor(windColor)
                  }}
                >
                  {convertWindSpeed(d.windAverage, unit) ?? '-'}
                </td>
              );
            })}
          </tr>

          {/* Gust row */}
          <tr>
            {tableData.map((d) => {
              const gustColor = getWindColorForSport(d.windGust ?? null, sport);
              return (
                <td
                  key={String(d.time)}
                  className="text-center text-xs sm:text-sm p-0 sm:p-0.5"
                  style={{
                    backgroundColor: gustColor,
                    color: getTextColor(gustColor)
                  }}
                >
                  {convertWindSpeed(d.windGust, unit) ?? '-'}
                </td>
              );
            })}
          </tr>

          {/* Direction text row */}
          <tr>
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className="text-center text-muted-foreground text-xs sm:text-sm p-0 sm:p-0.5"
              >
                {d.windBearing == null || (d.windAverage == null && d.windGust == null)
                  ? ''
                  : getWindDirectionFromBearing(d.windBearing)}
              </td>
            ))}
          </tr>

          {/* Direction arrow row */}
          <tr>
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className="p-0 text-center"
                style={{
                  background: getDirectionColor(
                    d.windAverage == null && d.windGust == null ? null : d.windBearing,
                    validBearings
                  )
                }}
              >
                {d.windBearing == null || (d.windAverage == null && d.windGust == null) ? (
                  '-'
                ) : (
                  <div className="flex items-center justify-center">
                    <DirectionArrow
                      className="h-4 w-4"
                      style={{
                        transform: `rotate(${Math.round(180 + d.windBearing)}deg)`
                      }}
                    />
                  </div>
                )}
              </td>
            ))}
          </tr>

          {/* Bearing degrees row */}
          <tr>
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className="text-center text-muted-foreground text-xs sm:text-sm p-0 sm:p-0.5"
              >
                {d.windBearing == null || (d.windAverage == null && d.windGust == null)
                  ? ''
                  : `${Math.round(d.windBearing).toString().padStart(3, '0')}°`}
              </td>
            ))}
          </tr>

          {/* Temperature row */}
          <tr>
            {tableData.map((d) => (
              <td
                key={String(d.time)}
                className="text-center text-muted-foreground text-xs sm:text-sm p-0 sm:p-0.5"
              >
                {d.temperature == null ? '-' : `${Math.round(d.temperature)}°C`}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
