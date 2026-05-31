import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Avatar, Chip, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import { Security, Logout, Menu as MenuIcon, Dashboard, Analytics } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    handleMenuClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ gap: { xs: 1, sm: 2 } }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '6px',
              backgroundColor: '#0f172a',
            }}
          >
            <Security sx={{ fontSize: 18, color: '#ffffff' }} />
          </Box>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{ 
              cursor: 'pointer', 
              letterSpacing: '-0.3px', 
              color: '#0f172a',
              display: { xs: 'none', sm: 'block' } // Hide text on very small screens to save space
            }}
            onClick={() => navigate('/dashboard')}
          >
            ComplianceAI
          </Typography>

          <Chip
            label="Mining Safety"
            size="small"
            sx={{
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              fontWeight: 600,
              fontSize: '0.7rem',
              display: { xs: 'none', md: 'flex' } // Only show chip on medium+ screens
            }}
          />

          <Box sx={{ flex: 1 }} />

          {/* Desktop Navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, alignItems: 'center' }}>
            <Button
              size="small"
              onClick={() => handleNavigate('/dashboard')}
              sx={{ 
                color: location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/documents') ? 'text.primary' : 'text.secondary', 
                backgroundColor: location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/documents') ? '#f1f5f9' : 'transparent',
                '&:hover': { color: 'text.primary', backgroundColor: '#f1f5f9' } 
              }}
            >
              Dashboard
            </Button>
            <Button
              size="small"
              onClick={() => handleNavigate('/gap-analysis')}
              sx={{ 
                color: location.pathname === '/gap-analysis' ? 'text.primary' : 'text.secondary', 
                backgroundColor: location.pathname === '/gap-analysis' ? '#f1f5f9' : 'transparent',
                '&:hover': { color: 'text.primary', backgroundColor: '#f1f5f9' } 
              }}
            >
              Gap Analysis
            </Button>

            <Avatar
              sx={{ width: 32, height: 32, bgcolor: '#e2e8f0', color: '#0f172a', fontSize: '0.8rem', fontWeight: 600, ml: 1 }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>

            <Button
              size="small"
              startIcon={<Logout sx={{ fontSize: 16 }} />}
              onClick={handleLogout}
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', backgroundColor: '#fef2f2' } }}
            >
              Logout
            </Button>
          </Box>

          {/* Mobile Navigation (Hamburger Menu) */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1 }}>
            <Avatar
              sx={{ width: 28, height: 28, bgcolor: '#e2e8f0', color: '#0f172a', fontSize: '0.7rem', fontWeight: 600 }}
            >
              {user?.username?.charAt(0).toUpperCase()}
            </Avatar>
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{ color: '#0f172a' }}
            >
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
                  mt: 1.5,
                  border: '1px solid #e2e8f0',
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => handleNavigate('/dashboard')} selected={location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/documents')}>
                <ListItemIcon>
                  <Dashboard fontSize="small" sx={{ color: '#64748b' }} />
                </ListItemIcon>
                <ListItemText primary="Dashboard" sx={{ color: '#0f172a' }} />
              </MenuItem>
              <MenuItem onClick={() => handleNavigate('/gap-analysis')} selected={location.pathname === '/gap-analysis'}>
                <ListItemIcon>
                  <Analytics fontSize="small" sx={{ color: '#64748b' }} />
                </ListItemIcon>
                <ListItemText primary="Gap Analysis" sx={{ color: '#0f172a' }} />
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" sx={{ color: '#ef4444' }} />
                </ListItemIcon>
                <ListItemText primary="Logout" sx={{ color: '#ef4444' }} />
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flex: 1, p: { xs: 2, md: 4, lg: 6 }, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%', maxWidth: 1400 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout;
