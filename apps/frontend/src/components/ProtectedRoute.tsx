import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isHydrated } = useAuthStore((s) => ({ user: s.user, isHydrated: s.isHydrated }));

  if (!isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-200 border-t-primary-600"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
