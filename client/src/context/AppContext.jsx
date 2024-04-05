import { createContext, useState } from 'react';
import PropTypes from 'prop-types';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [refreshedStations, setRefreshedStations] = useState([]);
  const [refreshedWebcams, setRefreshedWebcams] = useState([]);

  return (
    <AppContext.Provider
      value={{
        refreshedStations,
        setRefreshedStations,
        refreshedWebcams,
        setRefreshedWebcams
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired
};
