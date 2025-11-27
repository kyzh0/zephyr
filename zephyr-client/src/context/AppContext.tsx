import { createContext, useContext, useState, type ReactNode } from "react";

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

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
