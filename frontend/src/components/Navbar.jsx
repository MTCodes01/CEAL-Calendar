import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { getContrastColor } from '../utils/colorUtils';

export default function Navbar() {
  const { user, logout, isGuest } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async (e) => {
    e.stopPropagation();
    await logout();
    navigate('/login');
  };

  return (
    <nav className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 border-b border-slate-200 dark:border-neutral-800 transition-colors">
      <div className="w-full px-3 sm:px-4">
        <div className="flex justify-between items-center h-16 gap-2">
          {/* Logo on the Left */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/calendar" className="flex items-center gap-2">
              <img 
                src={theme === 'dark' ? '/CEAL%20Calendar%20-%20White%20-%20Full.svg' : '/CEAL%20Calendar%20-%20Black%20-%20Full.svg'} 
                alt="CEAL Calendar Logo" 
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </Link>
          </div>

          {/* Right-side controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ThemeToggle />

            {/* Guest mode: show Login button */}
            {isGuest && !user && (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                <span>Login</span>
              </Link>
            )}

            {/* Logged in User: Username, Labels, Profile circle (clickable to /profile), and Logout */}
            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2.5">
                {/* Clickable Profile Area (Username, Labels, Avatar circle) */}
                <Link
                  to="/profile"
                  title="View Profile & Settings"
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800/60 transition-colors group"
                >
                  {/* Username & Labels */}
                  <div className="flex flex-col items-end justify-center text-right max-w-[110px] sm:max-w-[150px]">
                    <span className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {user.first_name} {user.last_name}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1 mt-0.5">
                      {user.sub_club ? (
                        <span 
                          className="text-[8px] font-semibold px-1.5 py-0.2 rounded border uppercase tracking-wider whitespace-nowrap"
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
                          className="text-[8px] font-semibold px-1.5 py-0.2 rounded border uppercase tracking-wider whitespace-nowrap"
                          style={{ 
                            backgroundColor: user.club.color, 
                            borderColor: user.club.color,
                            color: getContrastColor(user.club.color) 
                          }}
                        >
                          {user.club.name}
                        </span>
                      ) : user.is_superuser ? (
                        <span className="text-[8px] font-semibold px-1.5 py-0.2 rounded uppercase tracking-wider whitespace-nowrap bg-slate-900 text-white dark:bg-white dark:text-neutral-900">
                          Superadmin
                        </span>
                      ) : user.is_staff ? (
                        <span className="text-[8px] font-semibold px-1.5 py-0.2 rounded uppercase tracking-wider whitespace-nowrap bg-blue-700 text-white">
                          Admin
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>

                {/* Logout Icon */}
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
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
