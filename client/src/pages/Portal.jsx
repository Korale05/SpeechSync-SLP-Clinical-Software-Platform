import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { ROLES } from '../store/authStore';

const Portal = () => {
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case ROLES.PARENT:
      return <Navigate to="/parent/dashboard" replace />;
    case ROLES.SCHOOL_COORDINATOR:
      return <Navigate to="/school/dashboard" replace />;
    case ROLES.SLP:
    case ROLES.ADMIN:
      return <Navigate to="/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};

export default Portal;
