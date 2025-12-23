/**
 * Login Page for InvestGhanaHub
 * User authentication with email and password
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';
import { authAPI } from '../utils/api';
import FormInput from '../components/FormInput';

interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
    };
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await authAPI.login(formData.email, formData.password);
      
      if (response.success) {
        const user = response.data.user;
        login(user, response.data.token);
        toast.success('Welcome back!');
        
        // Role-based navigation with context-aware routing
        if (user.role === 'ADMIN') {
          navigate('/admin');
        } else if (user.role === 'BUSINESS_OWNER') {
          // Check if business is set up
          navigate('/owner', { 
            replace: true,
            state: { from: '/login' }
          });
        } else if (user.role === 'INVESTOR') {
          // Check KYC status for investors
          if (user.kycStatus === 'APPROVED') {
            navigate('/investor');
          } else if (user.kycStatus === 'REJECTED') {
            navigate('/kyc', {
              state: { 
                message: 'Your KYC was rejected. Please resubmit.',
                previousStatus: 'REJECTED'
              }
            });
          } else {
            // PENDING or NOT_SUBMITTED
            navigate('/kyc', {
              state: {
                message: 'Complete KYC verification to start investing',
                previousStatus: user.kycStatus
              }
            });
          }
        }
      }
    } catch (error: unknown) {
      const err = error as ApiErrorShape;
      const message = err.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      setErrors({ general: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <TrendingUp className="w-8 h-8 text-ghana-gold-500" />
            <span className="font-display font-bold text-2xl">InvestGhanaHub</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">Welcome back</h1>
            <p className="text-dark-400">Sign in to your account to continue</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.general && (
              <div className="p-4 bg-ghana-red-500/10 border border-ghana-red-500/30 rounded-xl text-ghana-red-400 text-sm">
                {errors.general}
              </div>
            )}

            <FormInput
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="kofi@example.com"
              error={errors.email}
              autoComplete="email"
            />

            <div className="relative">
              <FormInput
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                error={errors.password}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-dark-500 hover:text-dark-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link 
                to="/forgot-password" 
                className="text-sm text-ghana-gold-500 hover:text-ghana-gold-400"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p className="mt-8 text-center text-dark-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-ghana-gold-500 hover:text-ghana-gold-400 font-medium">
              Create account
            </Link>
          </p>

          {/* Test credentials */}
          <div className="mt-8 p-4 bg-dark-800/50 rounded-xl border border-dark-700">
            <p className="text-sm text-dark-400 mb-3 font-medium">Test Accounts:</p>
            <div className="space-y-2 text-xs text-dark-500">
              <p><span className="text-dark-400">Admin:</span> admin@investghanahub.com / Admin@123</p>
              <p><span className="text-dark-400">Investor:</span> kofi.mensah@email.com / Investor@123</p>
              <p><span className="text-dark-400">Owner:</span> akua.owusu@email.com / Owner@123</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-ghana-pattern opacity-20" />
        
        {/* Gradient orbs */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-ghana-gold-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-ghana-green-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-ghana-gold-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-ghana-gold-500/30">
            <TrendingUp className="w-10 h-10 text-dark-950" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">
            Invest in Ghana's Future
          </h2>
          <p className="text-dark-400">
            Join hundreds of investors supporting Ghana's economic growth through agriculture, startups, and established businesses.
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-10">
            <div className="text-center">
              <div className="text-2xl font-bold gradient-text">₵2.5M+</div>
              <div className="text-xs text-dark-500">Invested</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold gradient-text">150+</div>
              <div className="text-xs text-dark-500">Investors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold gradient-text">18%</div>
              <div className="text-xs text-dark-500">Avg. Return</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

