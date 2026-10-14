import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import ThemeToggle from '../components/ThemeToggle';
import ClubManagement from '../components/ClubManagement';
import api from '../api/client';
import { getContrastColor } from '../utils/colorUtils';

const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Asia/Tokyo', 'Asia/Singapore',
  'Asia/Dubai', 'Australia/Sydney', 'UTC'
];

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state: 'profile' | 'settings' | 'admin'
  const initialTab = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab state with search params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'settings', 'admin'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Profile Information Form
  const [profileForm, setProfileForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password Change Form
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Settings & Preferences Form
  const [settingsForm, setSettingsForm] = useState({
    notification_enabled: true,
    notification_time: '',
    timezone: 'Asia/Kolkata',
    time_format: '12h',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Admin Dashboard State
  const [adminTab, setAdminTab] = useState('users'); // 'users' | 'clubs'
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminClubs, setAdminClubs] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedClub, setSelectedClub] = useState('');
  const [selectedSubClub, setSelectedSubClub] = useState('');
  const [selectedExtraClubs, setSelectedExtraClubs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Update local forms when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      });
      setSettingsForm({
        notification_enabled: user.notification_enabled ?? true,
        notification_time: user.notification_time || '',
        timezone: user.timezone || 'Asia/Kolkata',
        time_format: user.time_format || '12h',
      });
    }
  }, [user]);

  // Load Admin Data if user is staff and on admin tab
  useEffect(() => {
    if ((user?.is_staff || user?.is_superuser) && activeTab === 'admin') {
      fetchAdminData();
    }
  }, [activeTab, user]);

  const fetchAdminData = async () => {
    try {
      setAdminLoading(true);
      const [usersRes, clubsRes] = await Promise.all([
        api.get('/api/auth/users/'),
        api.get('/api/clubs/')
      ]);
      setAdminUsers(usersRes.data.results || usersRes.data);
      setAdminClubs(clubsRes.data.results || clubsRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      toast.error('Failed to load administration data');
    } finally {
      setAdminLoading(false);
    }
  };

  // Handlers for Profile
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    const result = await updateProfile(profileForm);
    if (result.success) {
      toast.success('Profile updated successfully!');
    } else {
      toast.error(result.error || 'Failed to update profile');
    }
    setProfileLoading(false);
  };

  // Handlers for Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    try {
      await api.post('/api/auth/change-password/', passwordForm);
      toast.success('Password changed successfully!');
      setPasswordForm({ old_password: '', new_password: '' });
    } catch (err) {
      const errMsg = err.response?.data?.old_password?.[0] || 
                     err.response?.data?.new_password?.[0] || 
                     'Failed to change password';
      toast.error(errMsg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handlers for Settings
  const handleSettingsSubmit = async (e) => {
    if (e) e.preventDefault();
    setSettingsLoading(true);
    const result = await updateProfile(settingsForm);
    if (result.success) {
      toast.success('Preferences saved successfully!');
    } else {
      toast.error(result.error || 'Failed to save settings');
    }
    setSettingsLoading(false);
  };

  // Handlers for Admin User Editing
  const handleEditClick = (u) => {
    setEditingUser(u);
    setSelectedClub(u.club ? u.club.id : '');
    setSelectedSubClub(u.sub_club ? u.sub_club.id : '');
    setSelectedExtraClubs(u.extra_clubs ? u.extra_clubs.map(c => c.id) : []);
  };

  const handleSaveUserRoles = async () => {
    try {
      await api.patch(`/api/auth/users/${editingUser.id}/`, {
        club: selectedClub || null,
        sub_club: selectedSubClub || null,
        extra_clubs: selectedExtraClubs,
      });
      toast.success('User roles updated successfully!');
      setEditingUser(null);
      fetchAdminData();
    } catch (err) {
      console.error('Failed to update user', err);
      toast.error('Failed to update user roles');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.delete(`/api/auth/users/${userId}/`);
        toast.success('User deleted successfully');
        fetchAdminData();
      } catch (err) {
        console.error('Failed to delete user', err);
        toast.error('Failed to delete user');
      }
    }
  };

  const toggleExtraClub = (clubId) => {
    setSelectedExtraClubs(prev =>
      prev.includes(clubId)
        ? prev.filter(id => id !== clubId)
        : [...prev, clubId]
    );
  };

  // Filtered users for admin tab
  const filteredUsers = adminUsers.filter(u => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const hasMainClub = u.club && u.club.name && u.club.name.toLowerCase().includes(query);
    const hasSubClub = u.sub_club && u.sub_club.name && u.sub_club.name.toLowerCase().includes(query);
    const hasExtraClub = u.extra_clubs && u.extra_clubs.some(c => c.name && c.name.toLowerCase().includes(query));

    return fullName.includes(query) || 
           (u.email && u.email.toLowerCase().includes(query)) ||
           (u.username && u.username.toLowerCase().includes(query)) ||
           hasMainClub || hasSubClub || hasExtraClub;
  });

  const selectedMainClub = adminClubs.find(c => c.id === parseInt(selectedClub));
  const subClubOptions = selectedMainClub?.sub_clubs || [];
  const allFlatClubs = adminClubs.reduce((acc, c) => {
    acc.push(c);
    if (c.sub_clubs) acc.push(...c.sub_clubs);
    return acc;
  }, []);
  const primaryClubIds = new Set([
    selectedClub ? parseInt(selectedClub) : null,
    selectedSubClub ? parseInt(selectedSubClub) : null,
  ].filter(Boolean));
  const extraClubOptions = allFlatClubs.filter(c => !primaryClubIds.has(c.id));

  const hasAdminAccess = user?.is_staff || user?.is_superuser;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#070b12] text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Mobile Navbar: stays exactly as it is */}
      <Navbar />

      {/* Desktop Top Header Bar (Desktop only) */}
      <header className="hidden md:block sticky top-0 z-40 bg-white/80 dark:bg-gray-950/70 backdrop-blur-xl border-b border-gray-200/80 dark:border-white/5 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/calendar" className="flex items-center gap-2">
              <img 
                src={theme === 'dark' ? '/CEAL%20Calendar%20-%20White%20-%20Full.svg' : '/CEAL%20Calendar%20-%20Black%20-%20Full.svg'} 
                alt="CEAL Calendar Logo" 
                className="h-8 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              title="Logout"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* User Hero Banner */}
        <section className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5 rounded-2xl shadow-xl dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)] p-6 sm:p-8 transition-all">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-primary-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shadow-lg shadow-primary-500/20 border-2 border-white dark:border-gray-800">
                {user?.first_name?.[0]?.toUpperCase()}{user?.last_name?.[0]?.toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] text-white font-bold" title="Active">
                ✓
              </div>
            </div>

            {/* User Meta */}
            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {user?.first_name} {user?.last_name}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    @{user?.username} &bull; {user?.email}
                  </p>
                </div>
              </div>

              {/* Roles & Clubs Badges */}
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-4">
                {user?.is_superuser && (
                  <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm">
                    👑 Superadmin
                  </span>
                )}
                {user?.is_staff && !user?.is_superuser && (
                  <span className="px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-blue-600 text-white shadow-sm">
                    🛡️ Staff Admin
                  </span>
                )}
                {user?.club && (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase shadow-sm inline-flex items-center gap-1.5"
                    style={{
                      backgroundColor: user.club.color,
                      color: getContrastColor(user.club.color),
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getContrastColor(user.club.color) }} />
                    {user.club.name}
                  </span>
                )}
                {user?.sub_club && (
                  <span
                    className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase shadow-sm inline-flex items-center gap-1.5"
                    style={{
                      backgroundColor: user.sub_club.color,
                      color: getContrastColor(user.sub_club.color),
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getContrastColor(user.sub_club.color) }} />
                    {user.sub_club.name}
                  </span>
                )}
                {user?.extra_clubs?.map((c) => (
                  <span
                    key={`hero-extra-${c.id}`}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase border"
                    style={{
                      borderColor: c.color + '50',
                      color: c.color,
                      backgroundColor: c.color + '15',
                    }}
                  >
                    + {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Unified Tabs Header */}
        <div className="flex bg-gray-100/80 dark:bg-gray-900/80 p-1.5 rounded-2xl backdrop-blur-md border border-gray-200/60 dark:border-white/5 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => switchTab('profile')}
            className={`flex items-center justify-center gap-2 flex-1 min-w-[140px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile & Security
          </button>

          <button
            onClick={() => switchTab('settings')}
            className={`flex items-center justify-center gap-2 flex-1 min-w-[140px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-white shadow-md'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preferences & Settings
          </button>

          {hasAdminAccess && (
            <button
              onClick={() => switchTab('admin')}
              className={`flex items-center justify-center gap-2 flex-1 min-w-[140px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Administration
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                Staff
              </span>
            </button>
          )}
        </div>

        {/* TAB 1: Profile & Security */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-300">
            {/* Personal Information */}
            <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5 rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Personal Information</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Manage your name and account identity</p>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-100 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
                  />
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                    Email cannot be changed directly. Contact an administrator for email updates.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2">
                    Club Affiliations
                  </label>
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-gray-200/60 dark:border-white/5 bg-gray-50/50 dark:bg-gray-900/30">
                    {user?.club ? (
                      <span
                        className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                        style={{
                          backgroundColor: user.club.color,
                          color: getContrastColor(user.club.color),
                        }}
                      >
                        Main: {user.club.name}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No main club assigned</span>
                    )}
                    {user?.sub_club && (
                      <span
                        className="px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm"
                        style={{
                          backgroundColor: user.sub_club.color,
                          color: getContrastColor(user.sub_club.color),
                        }}
                      >
                        Sub: {user.sub_club.name}
                      </span>
                    )}
                    {user?.extra_clubs?.map((c) => (
                      <span
                        key={`profile-extra-${c.id}`}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold border"
                        style={{
                          borderColor: c.color + '40',
                          color: c.color,
                          backgroundColor: c.color + '15',
                        }}
                      >
                        Extra: {c.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-500 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {profileLoading ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password */}
            <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Security & Password</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Keep your account secure with a strong password</p>
                  </div>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.old_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/30 text-xs text-blue-800 dark:text-blue-300">
                    Use at least 8 characters with a mix of letters, numbers, and symbols.
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-500 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                    >
                      {passwordLoading ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Preferences & Settings */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Email Notifications Card */}
            <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5 rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Notifications</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Daily digests of event creations and updates</p>
                </div>
              </div>

              <form onSubmit={handleSettingsSubmit} className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200/60 dark:border-white/5 bg-gray-50/50 dark:bg-gray-900/40">
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">Enable Daily Notifications</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Receive an automated daily email summarizing events added or updated across CEAL clubs.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.notification_enabled}
                      onChange={(e) => setSettingsForm({ ...settingsForm, notification_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {settingsForm.notification_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                        Notification Time
                      </label>
                      <input
                        type="time"
                        required={settingsForm.notification_enabled}
                        value={settingsForm.notification_time}
                        onChange={(e) => setSettingsForm({ ...settingsForm, notification_time: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                      />
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Daily dispatch time</p>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                        Timezone
                      </label>
                      <select
                        value={settingsForm.timezone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none transition-colors"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Used for email scheduling</p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="px-6 py-2.5 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-500 shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
                  >
                    {settingsLoading ? 'Saving...' : 'Save Notification Preferences'}
                  </button>
                </div>
              </form>
            </div>

            {/* Calendar Display Preferences */}
            <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5 rounded-2xl shadow-xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Calendar Display Preferences</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Customize how time and schedules appear across the calendar</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-3">
                    Time Format
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settingsForm, time_format: '12h' };
                        setSettingsForm(updated);
                        updateProfile(updated);
                        toast.success('Time format set to 12-Hour');
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        settingsForm.time_format === '12h'
                          ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
                          : 'border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">12-Hour Format</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">e.g., 02:30 PM &bull; Standard</div>
                      </div>
                      <span className="text-lg">☀️</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settingsForm, time_format: '24h' };
                        setSettingsForm(updated);
                        updateProfile(updated);
                        toast.success('Time format set to 24-Hour');
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                        settingsForm.time_format === '24h'
                          ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
                          : 'border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm">24-Hour Format</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">e.g., 14:30 &bull; Military time</div>
                      </div>
                      <span className="text-lg">🕒</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-3">
                    Appearance & Theme
                  </label>
                  <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200/60 dark:border-white/5 bg-gray-50/50 dark:bg-gray-900/40">
                    <div>
                      <div className="text-sm font-bold text-gray-900 dark:text-white">Active Theme</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Current mode: <span className="font-semibold capitalize text-primary-600 dark:text-primary-400">{theme}</span>
                      </div>
                    </div>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Administration (Staff only) */}
        {activeTab === 'admin' && hasAdminAccess && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Admin Sub-Tabs */}
            <div className="flex items-center justify-between border-b border-gray-200/80 dark:border-white/5 pb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setAdminTab('users')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    adminTab === 'users'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  👥 Manage Users & Roles
                </button>
                <button
                  onClick={() => setAdminTab('clubs')}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                    adminTab === 'clubs'
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  🏛️ Club Hierarchy & Management
                </button>
              </div>

              {adminTab === 'users' && (
                <div className="relative w-48 sm:w-64">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-900/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Sub-tab 1: Users */}
            {adminTab === 'users' && (
              <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden">
                {adminLoading ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Loading user directory...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-white/5">
                      <thead className="bg-gray-50/70 dark:bg-gray-900/50">
                        <tr>
                          <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Details</th>
                          <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email Address</th>
                          <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Main Club</th>
                          <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sub Club</th>
                          <th className="px-5 py-3.5 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Extra Clubs</th>
                          <th className="px-5 py-3.5 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-6 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                              No users match "{searchQuery}"
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.02] transition-colors">
                              <td className="px-5 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {u.first_name?.[0]?.toUpperCase()}{u.last_name?.[0]?.toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                                      {u.first_name} {u.last_name}
                                    </div>
                                    <div className="text-xs text-gray-400">@{u.username}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                {u.email}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-sm">
                                {u.club ? (
                                  <span
                                    className="px-2.5 py-0.5 rounded-full text-xs font-extrabold shadow-sm uppercase tracking-wider"
                                    style={{
                                      backgroundColor: u.club.color,
                                      color: getContrastColor(u.club.color),
                                    }}
                                  >
                                    {u.club.name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-sm">
                                {u.sub_club ? (
                                  <span
                                    className="px-2.5 py-0.5 rounded-full text-xs font-extrabold shadow-sm uppercase tracking-wider"
                                    style={{
                                      backgroundColor: u.sub_club.color,
                                      color: getContrastColor(u.sub_club.color),
                                    }}
                                  >
                                    {u.sub_club.name}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-sm">
                                {u.extra_clubs && u.extra_clubs.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {u.extra_clubs.map(ec => (
                                      <span
                                        key={ec.id}
                                        className="px-2 py-0.5 text-xs font-bold rounded-full border"
                                        style={{ borderColor: ec.color + '40', color: ec.color, backgroundColor: ec.color + '15' }}
                                      >
                                        {ec.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="px-5 py-4 whitespace-nowrap text-right text-sm font-semibold space-x-2">
                                <button
                                  onClick={() => handleEditClick(u)}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Sub-tab 2: Clubs */}
            {adminTab === 'clubs' && (
              <div className="bg-white/90 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/80 dark:border-white/5 rounded-2xl shadow-xl p-6">
                <ClubManagement />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Admin User Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 text-center">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setEditingUser(null)} />

            <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 z-10">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assign Club Roles</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{editingUser.first_name} {editingUser.last_name} ({editingUser.email})</p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                    Main Club
                  </label>
                  <select
                    value={selectedClub}
                    onChange={(e) => {
                      setSelectedClub(e.target.value);
                      setSelectedSubClub('');
                      if (e.target.value) {
                        setSelectedExtraClubs(prev => prev.filter(id => id !== parseInt(e.target.value)));
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">None (General Member / Viewer)</option>
                    {adminClubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1">
                    Sub Club
                  </label>
                  <select
                    value={selectedSubClub}
                    onChange={(e) => {
                      setSelectedSubClub(e.target.value);
                      if (e.target.value) {
                        setSelectedExtraClubs(prev => prev.filter(id => id !== parseInt(e.target.value)));
                      }
                    }}
                    disabled={!selectedClub}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <option value="">None</option>
                    {subClubOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-1.5">
                    Additional Clubs (Multi-select)
                  </label>
                  {extraClubOptions.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No additional clubs available.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 dark:border-white/10 rounded-xl p-2 bg-gray-50 dark:bg-gray-900/50">
                      {extraClubOptions.map(c => {
                        const checked = selectedExtraClubs.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
                              checked ? 'bg-white dark:bg-gray-800 shadow-sm' : 'hover:bg-white/60 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleExtraClub(c.id)}
                              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                            />
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                            {c.parent && <span className="text-[10px] text-gray-400 ml-auto">sub-club</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserRoles}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-600 text-white hover:bg-primary-500 shadow-md transition-all"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
