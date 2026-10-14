import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { getContrastColor } from '../utils/colorUtils';

export default function ClubFilterSidebar({ clubs, selectedClubs, onToggleClub, onSelectAll, onDeselectAll, onClose }) {
  const { user, logout, isGuest } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  // Main clubs are those with no parent (the API returns them this way by default in ClubListView)
  const mainClubs = clubs.filter(club => !club.parent);

  const handleLogout = async (e) => {
    e.stopPropagation();
    await logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    navigate('/profile');
    if (onClose) onClose();
  };

  return (
    <div className="w-full md:w-64 bg-white/95 dark:bg-gray-950/60 md:bg-white/80 md:dark:bg-gray-950/60 backdrop-blur-xl shadow-lg p-4 md:p-5 flex flex-col h-full border-r border-gray-200/50 dark:border-white/5 z-10 transition-colors duration-200">
      {/* Desktop Header: Brand Logo & Theme Toggle */}
      <div className="hidden md:flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-white/5 flex-shrink-0">
        <Link to="/calendar" className="flex items-center gap-2">
          <img 
            src={theme === 'dark' ? '/CEAL%20Calendar%20-%20White%20-%20Full.svg' : '/CEAL%20Calendar%20-%20Black%20-%20Full.svg'} 
            alt="CEAL Calendar Logo" 
            className="h-8 w-auto object-contain"
          />
        </Link>
        <ThemeToggle />
      </div>

      {/* Filter by Club Header */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Filter by Club</h2>
        <button
          onClick={onClose}
          className="md:hidden p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* All / None Buttons */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <button
          onClick={onSelectAll}
          className={`flex-1 text-xs font-bold px-3 py-2 rounded-lg transition-all duration-300 transform active:scale-95 ${
            selectedClubs.length > 0 && selectedClubs.length >= clubs.reduce((acc, club) => acc + 1 + (club.sub_clubs ? club.sub_clubs.length : 0), 0)
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25 dark:shadow-md hover:bg-primary-500'
              : 'bg-white dark:bg-white/5 text-primary-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-white/10 border border-primary-200 dark:border-transparent shadow-sm'
          }`}
        >
          All
        </button>
        <button
          onClick={onDeselectAll}
          className={`flex-1 text-xs font-bold px-3 py-2 rounded-lg transition-all duration-300 transform active:scale-95 ${
            selectedClubs.length === 0
              ? 'bg-gray-800 dark:bg-white/10 text-white shadow-lg dark:shadow-none hover:bg-gray-900 dark:hover:bg-white/20'
              : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 border border-gray-200 dark:border-transparent shadow-sm'
          }`}
        >
          None
        </button>
      </div>

      {/* Scrollable Clubs List */}
      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {mainClubs.map((club) => (
          <div key={club.id} className="mb-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center">
              <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: club.color }} />
              {club.name}
            </h3>
            
            <div className="space-y-1 ml-2 border-l-2 border-gray-100 dark:border-gray-700 pl-2">
              {/* Main club checkbox */}
              <label
                className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition group"
              >
                <input
                  type="checkbox"
                  checked={selectedClubs.includes(club.id)}
                  onChange={() => onToggleClub(club.id)}
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                  {club.name}
                </span>
              </label>

              {/* Sub clubs */}
              {club.sub_clubs && club.sub_clubs.map((subClub) => (
                <label
                  key={subClub.id}
                  className="flex items-center space-x-3 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer transition group"
                >
                  <input
                    type="checkbox"
                    checked={selectedClubs.includes(subClub.id)}
                    onChange={() => onToggleClub(subClub.id)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <div 
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: subClub.color }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 group-hover:text-primary-600 dark:group-hover:text-primary-400">
                    {subClub.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom User Card / Profile & Logout (Image 2 style) */}
      <div className="mt-auto pt-3 border-t border-gray-200 dark:border-white/10 flex-shrink-0">
        {user ? (
          <div 
            onClick={handleProfileClick}
            title="Open Profile, Settings & Admin"
            className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Avatar circle */}
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white dark:border-gray-800 flex-shrink-0 group-hover:scale-105 transition-transform">
                {user.first_name?.[0]?.toUpperCase()}{user.last_name?.[0]?.toUpperCase()}
              </div>

              {/* User Name & Club Role Badge */}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                  {user.first_name} {user.last_name}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.sub_club ? (
                    <span 
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-[24px] shadow-sm uppercase tracking-wider whitespace-nowrap"
                      style={{ backgroundColor: user.sub_club.color, color: getContrastColor(user.sub_club.color) }}
                    >
                      {user.sub_club.name}
                    </span>
                  ) : user.club ? (
                    <span 
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-[24px] shadow-sm uppercase tracking-wider whitespace-nowrap"
                      style={{ backgroundColor: user.club.color, color: getContrastColor(user.club.color) }}
                    >
                      {user.club.name}
                    </span>
                  ) : user.is_superuser ? (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-[24px] shadow-sm uppercase tracking-wider whitespace-nowrap bg-purple-600 text-white">
                      Superadmin
                    </span>
                  ) : user.is_staff ? (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-[24px] shadow-sm uppercase tracking-wider whitespace-nowrap bg-blue-600 text-white">
                      Admin
                    </span>
                  ) : (
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-[24px] shadow-sm uppercase tracking-wider whitespace-nowrap bg-gray-600 text-white">
                      Member
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Logout Icon Button */}
            <button
              type="button"
              onClick={handleLogout}
              title="Logout"
              className="p-2 ml-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : isGuest ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-xs">
                G
              </div>
              <div className="text-xs">
                <div className="font-semibold text-gray-900 dark:text-white">Guest</div>
                <div className="text-gray-500 dark:text-gray-400 text-[10px]">Read-only mode</div>
              </div>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="px-2.5 py-1 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors shadow-sm"
            >
              Login
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
