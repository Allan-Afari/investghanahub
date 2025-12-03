/**
 * Reset Password Page for InvestGhanaHub
 * Set new password using reset token
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { TrendingUp, Loader2, Eye, EyeOff, CheckCircle2, XCircle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import FormInput from '../components/FormInput';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const response = await fetch(`${API_URL}/password/validate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      setIsValidToken(data.valid === true);
    } catch (error) {
      setIsValidToken(false);
    } finally {
      setIsValidating(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        toast.success('Password reset successful!');
      } else {
        toast.error(data.message || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-ghana-gold-500 animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Validating reset link...</p>
        </div>
      </div>
    );
  }

  // Invalid or missing token
  if (!token || !isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-ghana-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-ghana-red-500" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-4">Invalid Reset Link</h1>
          <p className="text-dark-400 mb-8">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link to="/forgot-password" className="btn-primary">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-ghana-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-ghana-green-500" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-4">Password Reset!</h1>
          <p className="text-dark-400 mb-8">
            Your password has been successfully reset. You can now login with your new password.
          </p>
          <Link to="/login" className="btn-primary">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fade-in">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 justify-center mb-8">
          <TrendingUp className="w-8 h-8 text-ghana-gold-500" />
          <span className="font-display font-bold text-2xl">InvestGhanaHub</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-ghana-gold-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-ghana-gold-500" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Create New Password</h1>
          <p className="text-dark-400">
            Enter your new password below.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <FormInput
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors({}); }}
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
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
            placeholder="Confirm your password"
            error={errors.confirmPassword}
            autoComplete="new-password"
          />

          {/* Password requirements */}
          <div className="p-4 bg-dark-800/50 rounded-xl">
            <p className="text-sm text-dark-400 mb-2">Password must have:</p>
            <ul className="space-y-1 text-sm">
              <li className={password.length >= 8 ? 'text-ghana-green-500' : 'text-dark-500'}>
                {password.length >= 8 ? '✓' : '○'} At least 8 characters
              </li>
              <li className={/[A-Z]/.test(password) ? 'text-ghana-green-500' : 'text-dark-500'}>
                {/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter
              </li>
              <li className={/[a-z]/.test(password) ? 'text-ghana-green-500' : 'text-dark-500'}>
                {/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter
              </li>
              <li className={/\d/.test(password) ? 'text-ghana-green-500' : 'text-dark-500'}>
                {/\d/.test(password) ? '✓' : '○'} One number
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

