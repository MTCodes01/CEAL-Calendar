import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const result = await signup(formData);

    if (result.success) {
      if (result.loginError) {
        setSignupSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        navigate('/calendar');
      }
    } else {
      setErrors(result.error || {});
    }
    setLoading(false);
  };

  return (
    <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative transition-colors">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="max-w-xl w-full mx-auto">
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl shadow-sm p-7 sm:p-8 transition-colors">
          <div className="text-center mb-6">
            <span className="font-['Pacifico',cursive] text-3xl text-slate-900 dark:text-white inline-block">
              Calendar
            </span>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white mt-3">
              Create account
            </h1>
            <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
              Join your club and start coordinating campus events
            </p>
          </div>

          {(errors.error || errors.non_field_errors) && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-4 py-3 rounded-lg mb-5 text-xs font-medium">
              {errors.error || errors.non_field_errors}
            </div>
          )}

          {signupSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-4 py-3 rounded-lg mb-5 text-xs font-medium">
              Account created successfully. Redirecting to sign in...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
                {errors.first_name && (
                  <p className="text-rose-600 dark:text-rose-400 text-xs mt-1">
                    {Array.isArray(errors.first_name) ? errors.first_name[0] : errors.first_name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
                {errors.last_name && (
                  <p className="text-rose-600 dark:text-rose-400 text-xs mt-1">
                    {Array.isArray(errors.last_name) ? errors.last_name[0] : errors.last_name}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                Email Address *
              </label>
              <input
                type="email"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="name@ceal.in"
              />
              {errors.email && (
                <p className="text-rose-600 dark:text-rose-400 text-xs mt-1">
                  {Array.isArray(errors.email) ? errors.email[0] : errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                Username *
              </label>
              <input
                type="text"
                required
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="username"
              />
              {errors.username && (
                <p className="text-rose-600 dark:text-rose-400 text-xs mt-1">
                  {Array.isArray(errors.username) ? errors.username[0] : errors.username}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                />
                {errors.password && (
                  <p className="text-rose-600 dark:text-rose-400 text-xs mt-1">
                    {Array.isArray(errors.password) ? errors.password[0] : errors.password}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  value={formData.password2}
                  onChange={(e) => setFormData({ ...formData, password2: e.target.value })}
                  placeholder="••••••••"
                />
                {errors.password2 && (
                  <p className="text-rose-600 dark:text-rose-400 text-xs mt-1">
                    {Array.isArray(errors.password2) ? errors.password2[0] : errors.password2}
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium text-xs sm:text-sm shadow-xs transition-colors disabled:opacity-50 mt-3"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-xs text-slate-500 dark:text-neutral-400 text-center mt-6 font-normal">
            Already have an account?{' '}
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
