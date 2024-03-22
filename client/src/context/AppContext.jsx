import { createContext, useState } from 'react';
import PropTypes from 'prop-types';

export const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [refresh, setRefresh] = useState(0);

  return (
    <AppContext.Provider
      value={{
        refresh,
        setRefresh
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired
};
