import { createContext, use, useCallback, useMemo, type ReactNode } from 'react';
import { usePersistedState } from '@/hooks';
import { type SportType } from '@/components/map';

interface AppContextType {
  flyingMode: boolean;
  toggleFlyingMode: () => void;
  sport: SportType;
  setSport: (sport: SportType) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [flyingMode, setFlyingMode] = usePersistedState('flyingMode', false);
  const [sport, setSport] = usePersistedState<SportType>('sport', 'paragliding');

  const toggleFlyingMode = useCallback(() => {
    setFlyingMode((prev) => !prev);
  }, [setFlyingMode]);

  const value = useMemo<AppContextType>(
    () => ({ flyingMode, toggleFlyingMode, sport, setSport }),
    [flyingMode, toggleFlyingMode, sport, setSport]
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
