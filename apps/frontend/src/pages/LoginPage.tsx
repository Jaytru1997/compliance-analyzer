import React, { useState } from 'react';
import { Shield, Sparkles, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
      setError('Invalid credentials.');
    }
    setLoading(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface-50 px-4">
      {/* Decorative background elements */}
      <div className="pointer-events-none absolute -top-[200px] -right-[200px] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.03)_0%,transparent_70%)]"></div>
      <div className="pointer-events-none absolute -bottom-[100px] -left-[100px] h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.03)_0%,transparent_70%)]"></div>

      <div className="animate-fade-in relative z-10 w-full max-w-[420px] rounded-2xl border border-surface-200 bg-white p-6 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] sm:p-10">
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-900 text-white shadow-md">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-surface-900">
            ComplianceAI
          </h1>
          <p className="text-sm text-surface-500">
            Mining Safety Document Analyzer
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-username" className="text-sm font-medium text-surface-700">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              required
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="Enter your username"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-sm font-medium text-surface-700">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 hover:text-surface-600 focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="btn-primary mt-2 h-11 text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                Signing in…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Sign In
              </span>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-surface-400">
          Demo credentials: <span className="font-semibold text-surface-600">___</span> / <span className="font-semibold text-surface-600">___</span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
