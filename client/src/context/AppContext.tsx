import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';
import { getStoredValue, setStoredValue } from '@/components/map/map.utils';
import { type SportType } from '@/components/map';

interface AppContextType {
  user?: unknown;
  isLoading?: boolean;
  refreshedStations: string[];
  setRefreshedStations: (ids: string[]) => void;
  refreshedWebcams: string[];
  setRefreshedWebcams: (ids: string[]) => void;
  flyingMode: boolean;
  toggleFlyingMode: () => void;
  sport: SportType;
  setSport: (sport: SportType) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [refreshedStations, setRefreshedStations] = useState<string[]>([]);
  const [refreshedWebcams, setRefreshedWebcams] = useState<string[]>([]);
  const [flyingMode, setFlyingMode] = useState(() => getStoredValue('flyingMode', false));
  const [sport, setSportState] = useState<SportType>(() =>
    getStoredValue<SportType>('sport', 'paragliding')
  );

  const toggleFlyingMode = useCallback(() => {
    setFlyingMode((prev) => {
      const next = !prev;
      setStoredValue('flyingMode', next);
      return next;
    });
  }, []);

  const setSport = useCallback((newSport: SportType) => {
    setSportState(newSport);
    setStoredValue('sport', newSport);
  }, []);

  const value = useMemo<AppContextType>(
    () => ({
      user: null,
      isLoading: false,
      refreshedStations,
      setRefreshedStations,
      refreshedWebcams,
      setRefreshedWebcams,
      flyingMode,
      toggleFlyingMode,
      sport,
      setSport
    }),
    [refreshedStations, refreshedWebcams, flyingMode, toggleFlyingMode, sport, setSport]
  );

  return <AppContext value={value}>{children}</AppContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const context = use(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
