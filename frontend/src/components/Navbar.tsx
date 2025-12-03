/**
 * Navbar Component for InvestGhanaHub
 * Responsive navigation with user menu
 */

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  TrendingUp, 
  Menu, 
  X, 
  User, 
  LogOut, 
  LayoutDashboard,
  ChevronDown,
  Shield,
  Building2,
  Wallet,
  Bell
} from 'lucide-react';
import { useAuth } from '../App';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Get dashboard link based on role
  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'BUSINESS_OWNER') return '/owner';
    return '/investor';
  };

  // Navigation links for authenticated users
  const getNavLinks = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'ADMIN':
        return [
          { label: 'Dashboard', href: '/admin', icon: LayoutDashboard }
        ];
      case 'BUSINESS_OWNER':
        return [
          { label: 'My Businesses', href: '/owner', icon: Building2 },
          { label: 'Wallet', href: '/wallet', icon: Wallet },
          { label: 'KYC', href: '/kyc', icon: Shield }
        ];
      case 'INVESTOR':
        return [
          { label: 'Invest', href: '/investor', icon: TrendingUp },
          { label: 'Wallet', href: '/wallet', icon: Wallet },
          { label: 'KYC', href: '/kyc', icon: Shield }
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-dark-950/80 backdrop-blur-lg border-b border-dark-800">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-ghana-gold-400 to-ghana-gold-600 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5 text-dark-950" />
            </div>
            <span className="font-display font-bold text-xl hidden sm:block">InvestGhanaHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {/* Public links */}
            {!isAuthenticated && (
              <>
                <Link to="/" className={`text-sm font-medium transition-colors ${
                  isActive('/') ? 'text-ghana-gold-500' : 'text-dark-400 hover:text-dark-200'
                }`}>
                  Home
                </Link>
              </>
            )}

            {/* Authenticated links */}
            {isAuthenticated && navLinks.map(link => (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isActive(link.href) ? 'text-ghana-gold-500' : 'text-dark-400 hover:text-dark-200'
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              /* User menu */
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-dark-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-ghana-gold-400 to-ghana-gold-600 flex items-center justify-center text-dark-950 font-bold text-sm">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-dark-200">{user?.firstName}</p>
                    <p className="text-xs text-dark-500 capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-dark-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 py-2 bg-dark-800 border border-dark-700 rounded-xl shadow-xl animate-slide-in-right">
                    <div className="px-4 py-2 border-b border-dark-700">
                      <p className="font-medium text-dark-200">{user?.firstName} {user?.lastName}</p>
                      <p className="text-sm text-dark-500">{user?.email}</p>
                    </div>
                    
                    <Link
                      to={getDashboardLink()}
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-dark-300 hover:bg-dark-700 transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                    
                    <Link
                      to="/kyc"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-dark-300 hover:bg-dark-700 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      KYC Status
                    </Link>
                    
                    <hr className="my-2 border-dark-700" />
                    
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2 text-ghana-red-400 hover:bg-dark-700 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Auth buttons */
              <div className="hidden sm:flex items-center gap-3">
                <Link to="/login" className="btn-ghost">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary py-2 px-4 text-sm">
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-dark-400 hover:text-dark-200"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-dark-800 animate-fade-in">
            {/* Navigation links */}
            <div className="space-y-1">
              {!isAuthenticated && (
                <Link
                  to="/"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                    isActive('/') ? 'bg-dark-800 text-ghana-gold-500' : 'text-dark-400'
                  }`}
                >
                  Home
                </Link>
              )}
              
              {isAuthenticated && navLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                    isActive(link.href) ? 'bg-dark-800 text-ghana-gold-500' : 'text-dark-400'
                  }`}
                >
                  <link.icon className="w-5 h-5" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Auth buttons for mobile */}
            {!isAuthenticated && (
              <div className="mt-4 pt-4 border-t border-dark-800 space-y-2 px-4">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-secondary w-full text-center"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="btn-primary w-full text-center"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Logout for mobile */}
            {isAuthenticated && (
              <div className="mt-4 pt-4 border-t border-dark-800 px-4">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 text-ghana-red-400 rounded-lg hover:bg-dark-800"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(isUserMenuOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => { setIsUserMenuOpen(false); setIsMobileMenuOpen(false); }}
        />
      )}
    </nav>
  );
}

