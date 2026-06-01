import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, LogOut, Menu, LayoutDashboard, BarChart2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMobileMenuOpen(false);
  };

  const getNavClass = (isActive: boolean) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
      ? 'bg-surface-100 text-surface-900'
      : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900'
    }`;

  const isDashboardActive = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/document');
  const isGapActive = location.pathname === '/gap-analysis';

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <header className="sticky top-0 z-40 w-full border-b border-surface-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-900 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <span
              className="hidden cursor-pointer text-lg font-bold tracking-tight text-surface-900 sm:block"
              onClick={() => handleNavigate('/dashboard')}
            >
              ComplianceAI
            </span>
            <span className="hidden rounded-full border border-surface-200 bg-surface-50 px-2.5 py-0.5 text-xs font-semibold text-surface-600 md:inline-flex">
              Mining Safety
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-2 md:flex">
            <button
              onClick={() => handleNavigate('/dashboard')}
              className={getNavClass(isDashboardActive)}
            >
              Dashboard
            </button>
            <button
              onClick={() => handleNavigate('/gap-analysis')}
              className={getNavClass(isGapActive)}
            >
              Gap Analysis
            </button>

            <div className="ml-2 flex h-8 w-8 items-center justify-center rounded-full bg-surface-200 text-sm font-semibold text-surface-900">
              {user?.username?.charAt(0).toUpperCase()}
            </div>

            <button
              onClick={handleLogout}
              className="ml-2 flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-200 text-xs font-semibold text-surface-900">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="rounded-md p-1.5 text-surface-600 hover:bg-surface-100 hover:text-surface-900"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 right-4 z-50 w-48 overflow-hidden rounded-xl border border-surface-200 bg-white p-1 shadow-lg animate-fade-in md:hidden">
          <button
            onClick={() => handleNavigate('/dashboard')}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors ${isDashboardActive ? 'bg-surface-100 font-medium text-surface-900' : 'text-surface-700 hover:bg-surface-50'
              }`}
          >
            <LayoutDashboard className="h-4 w-4 text-surface-500" />
            Dashboard
          </button>
          <button
            onClick={() => handleNavigate('/gap-analysis')}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm transition-colors ${isGapActive ? 'bg-surface-100 font-medium text-surface-900' : 'text-surface-700 hover:bg-surface-50'
              }`}
          >
            <BarChart2 className="h-4 w-4 text-surface-500" />
            Gap Analysis
          </button>
          <div className="my-1 h-px bg-surface-200"></div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}

      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex justify-center">
        <div className="w-full max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;
