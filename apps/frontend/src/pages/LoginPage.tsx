import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  Fade,
} from '@mui/material';
import { Visibility, VisibilityOff, Security, AutoAwesome } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const ok = await login(username, password);
    if (ok) {
      navigate('/dashboard');
    } else {
      setError('Invalid credentials. Try admin / admin123');
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc', // Slate 50
        px: 2,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(15,23,42,0.03) 0%, transparent 70%)',
          top: -200,
          right: -200,
          pointerEvents: 'none',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.03) 0%, transparent 70%)',
          bottom: -100,
          left: -100,
          pointerEvents: 'none',
        },
      }}
    >
      <Fade in timeout={800}>
        <Card sx={{ width: '100%', maxWidth: 420, p: 1, position: 'relative', zIndex: 1, boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', border: '1px solid #e2e8f0' }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            {/* Logo / Brand */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 56,
                  height: 56,
                  borderRadius: '12px',
                  backgroundColor: '#0f172a',
                  mb: 2,
                }}
              >
                <Security sx={{ fontSize: 28, color: '#ffffff' }} />
              </Box>
              <Typography variant="h4" fontWeight={700} gutterBottom color="#0f172a" sx={{ letterSpacing: '-0.02em' }}>
                ComplianceAI
              </Typography>
              <Typography variant="body2" color="#64748b">
                Mining Safety Document Analyzer
              </Typography>
            </Box>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
            >
              {error && (
                <Alert severity="error" sx={{ borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <TextField
                id="login-username"
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                fullWidth
                size="medium"
              />

              <TextField
                id="login-password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                size="medium"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((s) => !s)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                id="login-submit"
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                startIcon={<AutoAwesome />}
                sx={{ mt: 1, backgroundColor: '#0f172a', '&:hover': { backgroundColor: '#1e293b' } }}
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </Box>

            <Typography variant="caption" color="#94a3b8" sx={{ display: 'block', mt: 4, textAlign: 'center' }}>
              Demo credentials: <Box component="span" sx={{ color: '#475569', fontWeight: 600 }}>admin</Box> / <Box component="span" sx={{ color: '#475569', fontWeight: 600 }}>admin123</Box>
            </Typography>
          </CardContent>
        </Card>
      </Fade>
    </Box>
  );
};

export default LoginPage;
