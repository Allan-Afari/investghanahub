/**
 * Register Page for InvestGhanaHub
 * New user registration for investors and business owners
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, Loader2, User, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../App';
import { authAPI } from '../utils/api';
import FormInput from '../components/FormInput';

interface ApiErrorShape {
  response?: {
    data?: {
      message?: string;
      errors?: BackendFieldError[];
    };
  };
}

interface BackendFieldError {
  path?: string;
  msg: string;
}

type Role = 'INVESTOR' | 'BUSINESS_OWNER';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'INVESTOR' as Role
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle role selection
  const handleRoleChange = (role: Role) => {
    setFormData(prev => ({ ...prev, role }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (formData.phone && !/^(\+233|0)[2-5][0-9]{8}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid Ghana phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, number, and special character';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      // Use dedicated endpoints based on role
      const endpoint = formData.role === 'INVESTOR'
        ? authAPI.registerInvestor
        : authAPI.registerBusinessOwner;

      const response = await endpoint({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password
      });

      if (response.success) {
        login(response.data.user, response.data.token);
        toast.success(response.message || 'Account created successfully!');

        // Role-based navigation
        if (formData.role === 'INVESTOR') {
          navigate('/kyc', {
            state: {
              message: 'Complete KYC verification to start investing',
              role: 'investor'
            }
          });
        } else {
          // Business owner goes to capital raising registration
          navigate('/capital-raising', {
            state: {
              message: 'Register your business to start raising capital',
              role: 'business_owner'
            }
          });
        }
      }
    } catch (error: unknown) {
      const err = error as ApiErrorShape;
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);

      // Handle validation errors from backend
      if (err.response?.data?.errors) {
        const backendErrors: Record<string, string> = {};
        err.response.data.errors.forEach((fieldError: unknown) => {
          const maybeObj = fieldError as { path?: unknown; field?: unknown; msg?: unknown; message?: unknown };
          const path =
            typeof maybeObj?.path === 'string'
              ? maybeObj.path
              : typeof maybeObj?.field === 'string'
                ? maybeObj.field
                : undefined;
          const msg =
            typeof maybeObj?.msg === 'string'
              ? maybeObj.msg
              : typeof maybeObj?.message === 'string'
                ? maybeObj.message
                : undefined;

          if (path && msg) {
            backendErrors[path] = msg;
            return;
          }

          if (!path && typeof fieldError === 'object' && fieldError) {
            const entries = Object.entries(fieldError);
            for (const [k, v] of entries) {
              if (typeof v === 'string') backendErrors[k] = v;
            }
          }
        });
        setErrors(backendErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 items-center justify-center p-12 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-ghana-pattern opacity-20" />

        {/* Gradient orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 bg-ghana-gold-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-ghana-green-500/20 rounded-full blur-3xl" />

        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-ghana-gold-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-ghana-gold-500/30">
            <TrendingUp className="w-10 h-10 text-dark-950" />
          </div>
          <h2 className="text-3xl font-display font-bold mb-4">
            Start Your Investment Journey
          </h2>
          <p className="text-dark-400 mb-8">
            Whether you want to invest or raise capital for your business, InvestGhanaHub connects you with opportunities.
          </p>

          {/* Features */}
          <div className="space-y-4 text-left">
            {[
              'Verified investment opportunities',
              'Secure transactions with encryption',
              'Ghana regulatory compliance',
              'Transparent tracking and reporting'
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-ghana-green-500/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-ghana-green-500" />
                </div>
                <span className="text-dark-300 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md animate-fade-in">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <TrendingUp className="w-8 h-8 text-ghana-gold-500" />
            <span className="font-display font-bold text-2xl">InvestGhanaHub</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">Create Account</h1>
            <p className="text-dark-400">Join Ghana's premier investment platform</p>
          </div>

          {/* Role Selection */}
          <div className="mb-6">
            <label className="label">I want to:</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleRoleChange('INVESTOR')}
                className={`p-4 rounded-xl border-2 transition-all ${formData.role === 'INVESTOR'
                    ? 'border-ghana-gold-500 bg-ghana-gold-500/10'
                    : 'border-dark-700 hover:border-dark-600'
                  }`}
              >
                <User className={`w-6 h-6 mx-auto mb-2 ${formData.role === 'INVESTOR' ? 'text-ghana-gold-500' : 'text-dark-400'
                  }`} />
                <span className={`block text-sm font-medium ${formData.role === 'INVESTOR' ? 'text-ghana-gold-500' : 'text-dark-300'
                  }`}>
                  Invest
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleRoleChange('BUSINESS_OWNER')}
                className={`p-4 rounded-xl border-2 transition-all ${formData.role === 'BUSINESS_OWNER'
                    ? 'border-ghana-gold-500 bg-ghana-gold-500/10'
                    : 'border-dark-700 hover:border-dark-600'
                  }`}
              >
                <Briefcase className={`w-6 h-6 mx-auto mb-2 ${formData.role === 'BUSINESS_OWNER' ? 'text-ghana-gold-500' : 'text-dark-400'
                  }`} />
                <span className={`block text-sm font-medium ${formData.role === 'BUSINESS_OWNER' ? 'text-ghana-gold-500' : 'text-dark-300'
                  }`}>
                  Raise Capital
                </span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="First Name"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Kofi"
                error={errors.firstName}
              />
              <FormInput
                label="Last Name"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Mensah"
                error={errors.lastName}
              />
            </div>

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

            <FormInput
              label="Phone Number (Optional)"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="+233240001234"
              error={errors.phone}
            />

            <div className="relative">
              <FormInput
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                error={errors.password}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[38px] text-dark-500 hover:text-dark-300"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <FormInput
              label="Confirm Password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <p className="text-xs text-dark-500 text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>

          {/* Sign in link */}
          <p className="mt-8 text-center text-dark-400">
            Already have an account?{' '}
            <Link to="/login" className="text-ghana-gold-500 hover:text-ghana-gold-400 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

