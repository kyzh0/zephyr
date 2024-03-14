import PropTypes from 'prop-types';
import { Navigate, Outlet } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function ProtectedRoute({ children }) {
  const auth = getAuth();
  const [user, loading] = useAuthState(auth);
  if (loading) {
    return;
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return children ? children : <Outlet />;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node
};
