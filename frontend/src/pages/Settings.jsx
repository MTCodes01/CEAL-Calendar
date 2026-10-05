import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'Europe/London',
  'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney', 'Asia/Dubai', 'UTC'
];

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    notification_enabled: true,
    notification_time: '',
    timezone: 'Asia/Kolkata',
    time_format: '12h',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        notification_enabled: user.notification_enabled ?? true,
        notification_time: user.notification_time || '',
        timezone: user.timezone || 'Asia/Kolkata',
        time_format: user.time_format || '12h',
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const result = await updateProfile(formData);

    if (result.success) {
      setMessage('Settings saved successfully!');
    } else {
      setError('Failed to save settings');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent transition-colors duration-200">
      <Navbar />
      
      <div className="max-w-3xl mx-auto p-8">
          <div className="space-y-6">
            <section className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-xl border border-transparent dark:border-white/5 rounded-2xl shadow-xl p-8 transition-colors duration-200">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Notification Settings</h1>

              {message && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg mb-6">
                  {message}
                </div>
              )}

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="notification_enabled"
                    checked={formData.notification_enabled}
                    onChange={(e) => setFormData({ ...formData, notification_enabled: e.target.checked })}
                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="notification_enabled" className="text-lg font-medium text-gray-900 dark:text-white">
                    Enable Email Notifications
                  </label>
                </div>

                {formData.notification_enabled && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notification Time (HH:MM)
                      </label>
                      <input
                        type="time"
                        required={formData.notification_enabled}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white transition-colors"
                        value={formData.notification_time}
                        onChange={(e) => setFormData({ ...formData, notification_time: e.target.value })}
                      />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        You'll receive a daily email at this time if events were added or updated across any clubs.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Timezone
                      </label>
                      <select
                        className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white transition-colors"
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-500 shadow-md dark:shadow-sm hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? 'Saving...' : 'Save Settings'}
                </button>
              </form>

              <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">ℹ️ How Notifications Work</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Emails are sent if events were added or updated since your last notification</li>
                  <li>• Events from all CEAL clubs will be included</li>
                  <li>• Other members will continue to receive notifications if they have them enabled</li>
                </ul>
              </div>
            </section>

            <section className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-xl border border-transparent dark:border-white/5 rounded-2xl shadow-xl p-8 transition-colors duration-200">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Calendar Preferences</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Time Format
                </label>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, time_format: '12h' })}
                    className={`flex-1 flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                      formData.time_format === '12h'
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="font-semibold">12 Hour</span>
                    <span className="text-sm opacity-70">AM/PM</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, time_format: '24h' })}
                    className={`flex-1 flex items-center justify-between px-6 py-4 rounded-xl border-2 transition-all duration-200 ${
                      formData.time_format === '24h'
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <span className="font-semibold">24 Hour</span>
                    <span className="text-sm opacity-70">00:00 - 23:59</span>
                  </button>
                </div>
                <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  This affects how time is displayed across the calendar, event cards, and PDF exports.
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full sm:w-auto px-8 bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Update Preferences'}
                  </button>
                </div>
              </div>
            </section>
          </div>
      </div>
    </div>
  );
}
