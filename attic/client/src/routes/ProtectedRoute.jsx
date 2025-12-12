import { useContext } from 'react';
import PropTypes from 'prop-types';
import { Navigate, Outlet } from 'react-router-dom';
import { AppContext } from '../context/AppContext';

export default function ProtectedRoute({ children }) {
  const { userKey } = useContext(AppContext);
  if (!userKey) {
    return <Navigate to="/" replace />;
  }
  return children ? children : <Outlet />;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node
};
