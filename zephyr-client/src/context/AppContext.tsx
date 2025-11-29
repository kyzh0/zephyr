import { createContext, use, useState, type ReactNode } from "react";

interface AppContextType {
  // TODO: Define your app state here
  user?: unknown;
  isLoading?: boolean;
  refreshedStations: string[];
  setRefreshedStations: (ids: string[]) => void;
  refreshedWebcams: string[];
  setRefreshedWebcams: (ids: string[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [refreshedStations, setRefreshedStations] = useState<string[]>([]);
  const [refreshedWebcams, setRefreshedWebcams] = useState<string[]>([]);

  const value: AppContextType = {
    user: null,
    isLoading: false,
    refreshedStations,
    setRefreshedStations,
    refreshedWebcams,
    setRefreshedWebcams,
  };

  return <AppContext value={value}>{children}</AppContext>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppContext() {
  const context = use(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
