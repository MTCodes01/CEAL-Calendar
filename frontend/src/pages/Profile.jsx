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
  const { theme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state: 'profile' (General) | 'settings' (Preferences) | 'admin' (Administration)
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
      toast.success('Profile updated successfully');
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
      toast.success('Password changed successfully');
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
      toast.success('Preferences saved successfully');
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
      toast.success('User roles updated successfully');
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
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'U';

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-neutral-950 text-slate-900 dark:text-neutral-100 transition-colors duration-150 overflow-x-hidden">
      {/*
        THESIS: High-craft collegiate administrative account hub that refuses AI slop (floating card grids, icon-in-box headings, clashing button colors, and duplicate badge spam).
        OWN-WORLD: Clean Linear/GitHub-inspired section cards with dedicated footer action bars, disciplined typography, authentic club hierarchy, and unified button aesthetics.
        STORY: Club leads and campus admins configure identity, manage credentials, tune daily digest schedules, and administer roles through an ergonomic, human-crafted settings interface.
        FIRST VIEWPORT: Clean top navbar with breadcrumbs, streamlined identity header with user details and verified role tags, followed by an underline navigation bar and structured section cards.
        FORM: Swiss-disciplined administrative account hub (seed: d3dfb229).
        FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
      */}

      {/* Mobile Navbar */}
      <Navbar />

      {/* Desktop Top Header Bar */}
      <header className="hidden md:block sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 border-b border-slate-200 dark:border-neutral-800 transition-colors">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-neutral-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Hub */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 w-full min-w-0">
        
        {/* Streamlined Identity Header (No floating card box) */}
        <section className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-2">
          {/* User Details & Status */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {user?.first_name} {user?.last_name}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-normal mt-0.5">
              @{user?.username} &bull; {user?.email}
            </p>

            {/* Roles Badges */}
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-1.5 mt-2.5">
              {user?.is_superuser && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-white dark:bg-white dark:text-neutral-900">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Superadmin
                </span>
              )}
              {user?.is_staff && !user?.is_superuser && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-700 text-white">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Staff Admin
                </span>
              )}
              {user?.club && (
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1.5 border"
                  style={{
                    backgroundColor: user.club.color,
                    borderColor: user.club.color,
                    color: getContrastColor(user.club.color),
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getContrastColor(user.club.color) }} />
                  {user.club.name}
                </span>
              )}
              {user?.sub_club && (
                <span
                  className="px-2 py-0.5 rounded text-[11px] font-semibold inline-flex items-center gap-1.5 border"
                  style={{
                    backgroundColor: user.sub_club.color,
                    borderColor: user.sub_club.color,
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
                  className="px-2 py-0.5 rounded text-[11px] font-medium border"
                  style={{
                    borderColor: c.color + '40',
                    color: c.color,
                    backgroundColor: c.color + '12',
                  }}
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Clean Underline Tabs Navigation */}
        <div className="border-b border-slate-200 dark:border-neutral-800">
          <nav className="flex space-x-4 sm:space-x-6 overflow-x-auto no-scrollbar -mb-px" aria-label="Tabs">
            <button
              onClick={() => switchTab('profile')}
              className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'profile'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:border-neutral-700'
              }`}
            >
              Account & Security
            </button>

            <button
              onClick={() => switchTab('settings')}
              className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:border-neutral-700'
              }`}
            >
              Preferences
            </button>

            {hasAdminAccess && (
              <button
                onClick={() => switchTab('admin')}
                className={`py-3 px-1 border-b-2 font-medium text-sm inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
                  activeTab === 'admin'
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:border-neutral-700'
                }`}
              >
                Administration
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700">
                  Staff
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* TAB 1: Account & Security */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            
            {/* Card 1: Personal Details */}
            <form onSubmit={handleProfileSubmit} className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-neutral-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Personal Information</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Update your display name as it appears on scheduled club events.
                </p>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.first_name}
                      onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.last_name}
                      onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60 text-slate-500 dark:text-neutral-400 text-sm cursor-not-allowed"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                    Institutional emails are managed by college administrators and cannot be altered directly.
                  </p>
                </div>
              </div>

              {/* Dedicated Card Footer Bar */}
              <div className="px-5 sm:px-6 py-3 bg-slate-50/70 dark:bg-neutral-950/50 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Ensure names match college identity records.
                </span>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors disabled:opacity-50"
                >
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            {/* Card 2: Institutional Club Affiliations */}
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-neutral-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Club Roles & Permissions</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Your designated club affiliations and event scheduling authorities.
                </p>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/40">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 block mb-1.5">
                      Primary Assigned Club
                    </span>
                    {user?.club ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-1 rounded text-xs font-semibold border"
                          style={{
                            backgroundColor: user.club.color,
                            borderColor: user.club.color,
                            color: getContrastColor(user.club.color),
                          }}
                        >
                          {user.club.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-neutral-400">Main Club</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">No primary club assigned</span>
                    )}
                  </div>

                  <div className="p-4 rounded-lg border border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-950/40">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 block mb-1.5">
                      Sub-Club Chapter
                    </span>
                    {user?.sub_club ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-1 rounded text-xs font-semibold border"
                          style={{
                            backgroundColor: user.sub_club.color,
                            borderColor: user.sub_club.color,
                            color: getContrastColor(user.sub_club.color),
                          }}
                        >
                          {user.sub_club.name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-neutral-400">Chapter Lead</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">None</span>
                    )}
                  </div>
                </div>

                {user?.extra_clubs && user.extra_clubs.length > 0 && (
                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-neutral-300 block mb-2">
                      Additional Affiliations
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {user.extra_clubs.map((c) => (
                        <span
                          key={`profile-extra-${c.id}`}
                          className="px-2.5 py-1 rounded text-xs font-medium border"
                          style={{
                            borderColor: c.color + '40',
                            color: c.color,
                            backgroundColor: c.color + '12',
                          }}
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 sm:px-6 py-3 bg-slate-50/70 dark:bg-neutral-950/50 border-t border-slate-100 dark:border-neutral-800">
                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Role assignments grant permission to add, edit, and publish events for associated clubs. Contact staff administrators for updates.
                </p>
              </div>
            </div>

            {/* Card 3: Security & Password */}
            <form onSubmit={handlePasswordSubmit} className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-neutral-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Security & Password</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Update your authentication password to maintain account security.
                </p>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.old_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Password must be at least 8 characters with a mix of letters, numbers, and symbols.
                </p>
              </div>

              {/* Dedicated Card Footer Bar */}
              <div className="px-5 sm:px-6 py-3 bg-slate-50/70 dark:bg-neutral-950/50 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                  You will remain signed in across your current active sessions.
                </span>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: Preferences */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            
            {/* Preferences Card 1: Daily Notifications */}
            <form onSubmit={handleSettingsSubmit} className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-neutral-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Daily Notifications</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Configure automated email digests for newly added or updated campus events.
                </p>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40">
                  <div>
                    <div className="text-xs font-semibold text-slate-900 dark:text-white">Enable Daily Digest Email</div>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                      Receive an automated daily email digest summarizing events across college clubs.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settingsForm.notification_enabled}
                      onChange={(e) => setSettingsForm({ ...settingsForm, notification_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settingsForm.notification_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                        Dispatch Time
                      </label>
                      <input
                        type="time"
                        required={settingsForm.notification_enabled}
                        value={settingsForm.notification_time}
                        onChange={(e) => setSettingsForm({ ...settingsForm, notification_time: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                        Timezone
                      </label>
                      <select
                        value={settingsForm.timezone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, timezone: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white text-sm focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-5 sm:px-6 py-3 bg-slate-50/70 dark:bg-neutral-950/50 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Digests are dispatched only when active event modifications occur.
                </span>
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs transition-colors disabled:opacity-50"
                >
                  {settingsLoading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>

            {/* Preferences Card 2: Calendar Display */}
            <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-neutral-800">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Calendar Display</h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                  Configure how time representations and active themes appear across the application.
                </p>
              </div>

              <div className="p-5 sm:p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-2">
                    Time Format
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settingsForm, time_format: '12h' };
                        setSettingsForm(updated);
                        updateProfile(updated);
                        toast.success('Time format set to 12-Hour');
                      }}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                        settingsForm.time_format === '12h'
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                          : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">12-Hour</div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400">02:30 PM</div>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settingsForm, time_format: '24h' };
                        setSettingsForm(updated);
                        updateProfile(updated);
                        toast.success('Time format set to 24-Hour');
                      }}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                        settingsForm.time_format === '24h'
                          ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200'
                          : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">24-Hour</div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400">14:30</div>
                      </div>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-2">
                    Interface Theme
                  </label>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-950/40 max-w-sm">
                    <span className="text-xs text-slate-700 dark:text-neutral-300 capitalize font-medium">
                      {theme} Mode
                    </span>
                    <ThemeToggle />
                  </div>
                </div>
              </div>

              <div className="px-5 sm:px-6 py-3 bg-slate-50/70 dark:bg-neutral-950/50 border-t border-slate-100 dark:border-neutral-800">
                <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                  Settings apply automatically to calendar grids, event badges, and PDF exports.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Administration (Staff only) */}
        {activeTab === 'admin' && hasAdminAccess && (
          <div className="space-y-5">
            {/* Admin Sub-Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-neutral-800 pb-3">
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setAdminTab('users')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-center rounded-lg text-xs font-medium transition-colors ${
                    adminTab === 'users'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-neutral-900 font-semibold'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Manage Users & Roles
                </button>
                <button
                  onClick={() => setAdminTab('clubs')}
                  className={`flex-1 sm:flex-none px-3 py-1.5 text-center rounded-lg text-xs font-medium transition-colors ${
                    adminTab === 'clubs'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-neutral-900 font-semibold'
                      : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Club Hierarchy
                </button>
              </div>

              {adminTab === 'users' && (
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                  />
                  <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Sub-tab 1: Users Directory */}
            {adminTab === 'users' && (
              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
                {adminLoading ? (
                  <div className="p-10 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Loading user directory...</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile User Cards (< md) */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-neutral-800">
                      {filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-500 dark:text-neutral-400">
                          No users match "{searchQuery}"
                        </div>
                      ) : (
                        filteredUsers.map((u) => (
                          <div key={`mobile-user-${u.id}`} className="p-4 space-y-2.5">
                            {/* Row 1: Avatar, Name, @username & Action Buttons */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="h-9 w-9 rounded-lg bg-slate-200 dark:bg-neutral-800 flex items-center justify-center text-slate-700 dark:text-neutral-300 text-xs font-bold flex-shrink-0">
                                  {u.first_name?.[0]?.toUpperCase()}{u.last_name?.[0]?.toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white truncate">
                                    {u.first_name} {u.last_name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 truncate">@{u.username}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleEditClick(u)}
                                  className="px-2.5 py-1 text-xs font-medium rounded-lg text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                >
                                  Edit Roles
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
                                  title="Delete user"
                                  aria-label={`Delete ${u.first_name}`}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Row 2: Email */}
                            <div className="text-xs text-slate-600 dark:text-neutral-400 flex items-center gap-1.5 truncate">
                              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">{u.email}</span>
                            </div>

                            {/* Row 3: Club badges */}
                            <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex flex-wrap items-center gap-2 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-medium text-slate-400 dark:text-neutral-500">Main:</span>
                                {u.club ? (
                                  <span
                                    className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                                    style={{
                                      backgroundColor: u.club.color,
                                      borderColor: u.club.color,
                                      color: getContrastColor(u.club.color),
                                    }}
                                  >
                                    {u.club.name}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-neutral-500 text-[11px]">—</span>
                                )}
                              </div>

                              {u.sub_club && (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-medium text-slate-400 dark:text-neutral-500">Sub:</span>
                                  <span
                                    className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                                    style={{
                                      backgroundColor: u.sub_club.color,
                                      borderColor: u.sub_club.color,
                                      color: getContrastColor(u.sub_club.color),
                                    }}
                                  >
                                    {u.sub_club.name}
                                  </span>
                                </div>
                              )}

                              {u.extra_clubs && u.extra_clubs.length > 0 && (
                                <div className="w-full flex flex-wrap items-center gap-1 pt-1">
                                  <span className="text-[11px] font-medium text-slate-400 dark:text-neutral-500 mr-1">Extra:</span>
                                  {u.extra_clubs.map((ec) => (
                                    <span
                                      key={`card-extra-${ec.id}`}
                                      className="px-1.5 py-0.5 text-[10px] font-medium rounded border"
                                      style={{ borderColor: ec.color + '40', color: ec.color, backgroundColor: ec.color + '12' }}
                                    >
                                      {ec.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Desktop Table (>= md) */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-neutral-800">
                        <thead className="bg-slate-50 dark:bg-neutral-950">
                          <tr>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-neutral-400">User</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-neutral-400">Email Address</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-neutral-400">Main Club</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-neutral-400">Sub Club</th>
                            <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-neutral-400">Extra Clubs</th>
                            <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 dark:text-neutral-400">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-neutral-800">
                          {filteredUsers.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="px-6 py-10 text-center text-xs text-slate-500 dark:text-neutral-400">
                                No users match "{searchQuery}"
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-800/40 transition-colors">
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-neutral-800 flex items-center justify-center text-slate-700 dark:text-neutral-300 text-xs font-bold flex-shrink-0">
                                      {u.first_name?.[0]?.toUpperCase()}{u.last_name?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                        {u.first_name} {u.last_name}
                                      </div>
                                      <div className="text-[11px] text-slate-400">@{u.username}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-600 dark:text-neutral-300">
                                  {u.email}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                                  {u.club ? (
                                    <span
                                      className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                                      style={{
                                        backgroundColor: u.club.color,
                                        borderColor: u.club.color,
                                        color: getContrastColor(u.club.color),
                                      }}
                                    >
                                      {u.club.name}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                                  {u.sub_club ? (
                                    <span
                                      className="px-2 py-0.5 rounded text-[11px] font-semibold border"
                                      style={{
                                        backgroundColor: u.sub_club.color,
                                        borderColor: u.sub_club.color,
                                        color: getContrastColor(u.sub_club.color),
                                      }}
                                    >
                                      {u.sub_club.name}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-xs">
                                  {u.extra_clubs && u.extra_clubs.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {u.extra_clubs.map(ec => (
                                        <span
                                          key={ec.id}
                                          className="px-1.5 py-0.2 text-[10px] font-medium rounded border"
                                          style={{ borderColor: ec.color + '40', color: ec.color, backgroundColor: ec.color + '12' }}
                                        >
                                          {ec.name}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap text-right text-xs font-medium space-x-1">
                                  <button
                                    onClick={() => handleEditClick(u)}
                                    className="px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                                  >
                                    Edit Roles
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="px-2 py-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
                  </>
                )}
              </div>
            )}

            {/* Sub-tab 2: Club Hierarchy */}
            {adminTab === 'clubs' && (
              <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs p-4 sm:p-6">
                <ClubManagement />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Admin User Role Assignment Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4 text-center">
            <div className="fixed inset-0 bg-black/60 transition-opacity" onClick={() => setEditingUser(null)} />

            <div className="inline-block w-full max-w-lg p-4 sm:p-6 my-4 sm:my-8 overflow-hidden text-left align-middle bg-white dark:bg-neutral-900 rounded-2xl shadow-xl border border-slate-200 dark:border-neutral-800 z-10">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Assign Club Roles</h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">{editingUser.first_name} {editingUser.last_name} ({editingUser.email})</p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">None (General Member / Viewer)</option>
                    {adminClubs.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1">
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-950 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">None</option>
                    {subClubOptions.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                    Additional Clubs
                  </label>
                  {extraClubOptions.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No additional clubs available.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 dark:border-neutral-800 rounded-lg p-2 bg-slate-50/50 dark:bg-neutral-950/50">
                      {extraClubOptions.map(c => {
                        const checked = selectedExtraClubs.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                              checked ? 'bg-white dark:bg-neutral-800 shadow-xs' : 'hover:bg-slate-100 dark:hover:bg-neutral-800/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleExtraClub(c.id)}
                              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                            <span className="text-xs text-slate-800 dark:text-neutral-200">{c.name}</span>
                            {c.parent && <span className="text-[10px] text-slate-400 ml-auto">sub-club</span>}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-slate-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUserRoles}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 shadow-xs transition-colors"
                >
                  Save Roles
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
