import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

export default function ResetPassword() {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      setMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.post(`/api/auth/password-reset/confirm/${uid}/${token}/`, { password });
      setMessage({ type: 'success', text: 'Password reset successfully. Redirecting to sign in...' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      const errData = error.response?.data;
      const errMsg =
        typeof errData === 'string'
          ? errData
          : errData?.error || errData?.detail || 'Invalid or expired reset token.';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-md w-full mx-auto">
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm p-7 sm:p-8 transition-colors">
          <div className="text-center mb-6">
            <Link to="/calendar" className="inline-block focus:outline-none mb-3">
              <img 
                src={theme === 'dark' ? '/CEAL%20Calendar%20-%20White%20-%20Full.svg' : '/CEAL%20Calendar%20-%20Black%20-%20Full.svg'} 
                alt="CEAL Calendar Logo" 
                className="h-9 sm:h-10 w-auto mx-auto object-contain"
              />
            </Link>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Set new password
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Please enter your new password below
            </p>
          </div>

          {message && (
            <div
              className={`rounded-lg px-4 py-3 text-xs font-medium mb-5 border ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5"
              >
                New Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="passwordConfirm"
                className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5"
              >
                Confirm New Password
              </label>
              <input
                id="passwordConfirm"
                name="passwordConfirm"
                type="password"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Repeat new password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Updating password...' : 'Update Password'}
            </button>
          </form>

          <p className="text-xs text-slate-500 dark:text-neutral-400 text-center mt-6 font-normal">
            Return to{' '}
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
