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
    <div className="w-full md:w-64 bg-white dark:bg-neutral-900 p-4 md:p-5 flex flex-col h-full border-r border-slate-200 dark:border-neutral-800 z-10 transition-colors">
      {/* Header: Brand Logo & Controls */}
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-neutral-800 flex-shrink-0">
        <Link to="/calendar" className="flex items-center gap-2" onClick={onClose}>
          <img 
            src={theme === 'dark' ? '/CEAL%20Calendar%20-%20White%20-%20Full.svg' : '/CEAL%20Calendar%20-%20Black%20-%20Full.svg'} 
            alt="CEAL Calendar Logo" 
            className="h-8 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-1.5">
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 -mr-1 text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter by Club Header */}
      <div className="flex justify-between items-center mb-3 flex-shrink-0">
        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Filter by Club</h2>
      </div>

      {/* All / None Buttons */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <button
          onClick={onSelectAll}
          className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            selectedClubs.length > 0 && selectedClubs.length >= clubs.reduce((acc, club) => acc + 1 + (club.sub_clubs ? club.sub_clubs.length : 0), 0)
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          All
        </button>
        <button
          onClick={onDeselectAll}
          className={`flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            selectedClubs.length === 0
              ? 'bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-900 shadow-xs'
              : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          None
        </button>
      </div>

      {/* Scrollable Clubs List */}
      <div className="flex-1 overflow-y-auto pr-1 min-h-0 custom-scrollbar">
        {mainClubs.map((club) => (
          <div key={club.id} className="mb-3.5">
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-neutral-400 uppercase tracking-wider mb-1.5 px-1.5 flex items-center">
              <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: club.color }} />
              {club.name}
            </h3>
            
            <div className="space-y-0.5 ml-1.5 border-l border-slate-200 dark:border-neutral-800 pl-2">
              {/* Main club checkbox */}
              <label
                className="flex items-center space-x-2.5 p-1 rounded-md hover:bg-slate-50 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors group"
              >
                <input
                  type="checkbox"
                  checked={selectedClubs.includes(club.id)}
                  onChange={() => onToggleClub(club.id)}
                  className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-neutral-700 dark:bg-neutral-950"
                />
                <span className="text-xs font-medium text-slate-800 dark:text-neutral-200 flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {club.name}
                </span>
              </label>

              {/* Sub clubs */}
              {club.sub_clubs && club.sub_clubs.map((subClub) => (
                <label
                  key={subClub.id}
                  className="flex items-center space-x-2.5 p-1 rounded-md hover:bg-slate-50 dark:hover:bg-neutral-800/60 cursor-pointer transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={selectedClubs.includes(subClub.id)}
                    onChange={() => onToggleClub(subClub.id)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-neutral-700 dark:bg-neutral-950"
                  />
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: subClub.color }}
                  />
                  <span className="text-xs text-slate-600 dark:text-neutral-400 flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {subClub.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom User Card / Profile & Logout */}
      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-neutral-800 flex-shrink-0">
        {user ? (
          <div 
            onClick={handleProfileClick}
            title="Open Profile & Settings"
            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {/* Initials Avatar */}
              <div className="h-8 w-8 rounded-lg bg-slate-900 dark:bg-neutral-800 border border-slate-700/20 dark:border-neutral-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {user.first_name?.[0]?.toUpperCase()}{user.last_name?.[0]?.toUpperCase()}
              </div>

              {/* User Name & Club Role Badge */}
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {user.first_name} {user.last_name}
                </div>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {user.sub_club ? (
                    <span 
                      className="text-[9px] font-semibold px-1.5 py-0.2 rounded border uppercase tracking-wider whitespace-nowrap"
                      style={{ 
                        backgroundColor: user.sub_club.color, 
                        borderColor: user.sub_club.color,
                        color: getContrastColor(user.sub_club.color) 
                      }}
                    >
                      {user.sub_club.name}
                    </span>
                  ) : user.club ? (
                    <span 
                      className="text-[9px] font-semibold px-1.5 py-0.2 rounded border uppercase tracking-wider whitespace-nowrap"
                      style={{ 
                        backgroundColor: user.club.color, 
                        borderColor: user.club.color,
                        color: getContrastColor(user.club.color) 
                      }}
                    >
                      {user.club.name}
                    </span>
                  ) : user.is_superuser ? (
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase tracking-wider whitespace-nowrap bg-slate-900 text-white dark:bg-white dark:text-neutral-900">
                      Superadmin
                    </span>
                  ) : user.is_staff ? (
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase tracking-wider whitespace-nowrap bg-blue-700 text-white">
                      Admin
                    </span>
                  ) : (
                    <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded uppercase tracking-wider whitespace-nowrap bg-slate-200 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300">
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
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : isGuest ? (
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-slate-200 dark:bg-neutral-700 flex items-center justify-center text-slate-700 dark:text-neutral-300 font-bold text-xs">
                G
              </div>
              <div className="text-xs">
                <div className="font-semibold text-slate-900 dark:text-white">Guest</div>
                <div className="text-slate-500 dark:text-neutral-400 text-[10px]">Read-only</div>
              </div>
            </div>
            <button
              onClick={() => {
                if (onClose) onClose();
                navigate('/login');
              }}
              className="px-2.5 py-1 text-xs font-semibold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-xs"
            >
              Login
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
