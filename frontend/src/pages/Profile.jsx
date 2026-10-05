import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../api/client';
import { getContrastColor } from '../utils/colorUtils';

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  });
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    const result = await updateProfile(formData);

    if (result.success) {
      setMessage('Profile updated successfully!');
    } else {
      setError('Failed to update profile');
    }
    setLoading(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      await api.post('/api/auth/change-password/', passwordData);
      setMessage('Password changed successfully!');
      setPasswordData({ old_password: '', new_password: '' });
    } catch (err) {
      setError(err.response?.data?.old_password?.[0] || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-transparent transition-colors duration-200">
      <Navbar />
      
      <div className="max-w-3xl mx-auto p-8 space-y-6">
        {message && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Info */}
        <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-xl border border-transparent dark:border-white/5 rounded-2xl shadow-xl p-8 transition-colors duration-200">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Profile</h1>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white transition-colors"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Last Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white transition-colors"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
              <input
                type="email"
                disabled
                className="w-full px-4 py-3 border border-gray-300 dark:border-white/5 rounded-lg bg-gray-100 dark:bg-gray-900/30 text-gray-500 dark:text-gray-500 cursor-not-allowed transition-colors"
                value={user?.email || ''}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Clubs</label>
              <div className="flex flex-wrap gap-2">
                {user?.club ? (
                  <div
                    className="px-4 py-3 rounded-lg inline-flex items-center gap-2 font-semibold shadow-md text-sm"
                    style={{
                      backgroundColor: user.club.color,
                      color: getContrastColor(user.club.color),
                      boxShadow: `0 2px 8px ${user.club.color}55`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full opacity-70" style={{ backgroundColor: getContrastColor(user.club.color) }} />
                    {user.club.name}
                  </div>
                ) : (
                  <p className="text-gray-600 dark:text-gray-400">No main club assigned</p>
                )}
                {user?.sub_club && (
                  <div
                    className="px-4 py-3 rounded-lg inline-flex items-center gap-2 font-semibold shadow-md text-sm"
                    style={{
                      backgroundColor: user.sub_club.color,
                      color: getContrastColor(user.sub_club.color),
                      boxShadow: `0 2px 8px ${user.sub_club.color}55`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full opacity-70" style={{ backgroundColor: getContrastColor(user.sub_club.color) }} />
                    {user.sub_club.name}
                  </div>
                )}
                {user?.extra_clubs?.map((club) => (
                  <div
                    key={`extra-${club.id}`}
                    className="px-4 py-3 rounded-lg inline-flex items-center gap-2 font-semibold shadow-md text-sm"
                    style={{
                      backgroundColor: club.color,
                      color: getContrastColor(club.color),
                      boxShadow: `0 2px 8px ${club.color}55`,
                    }}
                  >
                    <span className="w-2 h-2 rounded-full opacity-70" style={{ backgroundColor: getContrastColor(club.color) }} />
                    {club.name}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 transition-colors duration-200">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Change Password</h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Old Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={passwordData.old_password}
                onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">New Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
