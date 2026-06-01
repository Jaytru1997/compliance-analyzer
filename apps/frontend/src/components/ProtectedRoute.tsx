import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuthStore } from '../stores/authStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isHydrated } = useAuthStore((s) => ({ user: s.user, isHydrated: s.isHydrated }));

  if (!isHydrated) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
