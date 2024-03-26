import { createContext, useState } from 'react';
import PropTypes from 'prop-types';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [refreshedIds, setRefreshedIds] = useState([]);

  return (
    <AppContext.Provider
      value={{
        refreshedIds,
        setRefreshedIds
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired
};
