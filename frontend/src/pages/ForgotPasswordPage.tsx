/**
 * Forgot Password Page for InvestGhanaHub
 * Request password reset email
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import FormInput from '../components/FormInput';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/password/forgot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
      } else {
        toast.error(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-20 h-20 bg-ghana-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-ghana-green-500" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-4">Check Your Email</h1>
          <p className="text-dark-400 mb-6">
            If an account with <strong className="text-dark-200">{email}</strong> exists, 
            you'll receive a password reset link shortly.
          </p>
          <p className="text-sm text-dark-500 mb-8">
            Didn't receive the email? Check your spam folder or try again in a few minutes.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setIsSubmitted(false)}
              className="btn-secondary w-full"
            >
              Try Different Email
            </button>
            <Link to="/login" className="btn-ghost w-full flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
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
            <Mail className="w-8 h-8 text-ghana-gold-500" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Forgot Password?</h1>
          <p className="text-dark-400">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormInput
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(''); }}
            placeholder="kofi@example.com"
            error={error}
            autoComplete="email"
          />

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {/* Back to login */}
        <div className="mt-8 text-center">
          <Link 
            to="/login" 
            className="text-dark-400 hover:text-dark-200 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

