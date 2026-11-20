import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ThemeToggle from '../components/ThemeToggle';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/api/auth/password-reset/', { email });
      setSubmitted(true);
    } catch (err) {
      const errData = err.response?.data;
      const errMsg =
        typeof errData === 'string'
          ? errData
          : errData?.error || errData?.detail || 'Failed to send reset link.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative transition-colors">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm p-7 sm:p-8 text-center transition-colors">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Check your email
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mb-6 leading-relaxed">
              If an account exists for <span className="font-semibold text-slate-800 dark:text-neutral-200">{email}</span>, we have sent a password reset link.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-colors"
            >
              Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full mx-auto">
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm p-7 sm:p-8 transition-colors">
          <div className="text-center mb-6">
            <span className="font-['Pacifico',cursive] text-3xl text-slate-900 dark:text-white inline-block">
              Calendar
            </span>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-3">
              Reset password
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Enter your email to receive a secure recovery link
            </p>
          </div>

          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-lg mb-5 text-xs font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="name@ceal.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Sending link...' : 'Send Reset Link'}
            </button>
          </form>

          <p className="text-xs text-slate-500 dark:text-neutral-400 text-center mt-6 font-normal">
            Remembered your password?{' '}
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
