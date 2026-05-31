import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Avatar, Chip } from '@mui/material';
import { Security, Logout } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: 'rgba(10, 15, 30, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Toolbar sx={{ gap: 2 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
            }}
          >
            <Security sx={{ fontSize: 20, color: '#fff' }} />
          </Box>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ cursor: 'pointer', letterSpacing: '-0.3px' }}
            onClick={() => navigate('/dashboard')}
          >
            ComplianceAI
          </Typography>

          <Chip
            label="Mining Safety"
            size="small"
            sx={{
              background: 'rgba(16,185,129,0.15)',
              color: '#34d399',
              border: '1px solid rgba(16,185,129,0.3)',
              fontWeight: 600,
              fontSize: '0.7rem',
            }}
          />

          <Box sx={{ flex: 1 }} />

          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              onClick={() => navigate('/dashboard')}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              Dashboard
            </Button>
            <Button
              size="small"
              onClick={() => navigate('/gap-analysis')}
              sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
            >
              Gap Analysis
            </Button>

            <Avatar
              sx={{ width: 32, height: 32, bgcolor: 'primary.dark', fontSize: '0.8rem', fontWeight: 700 }}
            >
              {user?.username.charAt(0).toUpperCase()}
            </Avatar>

            <Button
              size="small"
              startIcon={<Logout sx={{ fontSize: 16 }} />}
              onClick={handleLogout}
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4 } }}>
        {children}
      </Box>
    </Box>
  );
};

export default AppLayout;
