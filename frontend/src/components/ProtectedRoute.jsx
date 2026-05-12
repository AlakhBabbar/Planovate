import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { canAccess } from '../utils/roleAccess';

const ProtectedRoute = ({ children }) => {
  const { token, user, getEffectiveRole } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const effectiveRole = getEffectiveRole();
  if (!canAccess(effectiveRole, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
