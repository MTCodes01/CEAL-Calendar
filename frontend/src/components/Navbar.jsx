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
    <nav className="md:hidden sticky top-0 z-50 bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl shadow-sm dark:shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-gray-200 dark:border-white/5 transition-colors duration-200">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold bg-primary-600 text-white hover:bg-primary-500 shadow-md transition-all duration-200"
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
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200 group"
                >
                  {/* Username & Labels */}
                  <div className="flex flex-col items-end justify-center text-right max-w-[110px] sm:max-w-[150px]">
                    <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {user.first_name} {user.last_name}
                    </span>
                    <div className="flex flex-wrap justify-end gap-1 mt-0.5">
                      {user.sub_club ? (
                        <span 
                          className="text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider whitespace-nowrap shadow-sm"
                          style={{ backgroundColor: user.sub_club.color, color: getContrastColor(user.sub_club.color) }}
                        >
                          {user.sub_club.name}
                        </span>
                      ) : user.club ? (
                        <span 
                          className="text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider whitespace-nowrap shadow-sm"
                          style={{ backgroundColor: user.club.color, color: getContrastColor(user.club.color) }}
                        >
                          {user.club.name}
                        </span>
                      ) : user.is_superuser ? (
                        <span className="text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider whitespace-nowrap bg-purple-600 text-white">
                          Superadmin
                        </span>
                      ) : user.is_staff ? (
                        <span className="text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider whitespace-nowrap bg-blue-600 text-white">
                          Admin
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Profile Circle Avatar */}
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-white dark:border-gray-800 flex-shrink-0 group-hover:scale-105 transition-transform">
                    {user.first_name?.[0]?.toUpperCase()}{user.last_name?.[0]?.toUpperCase()}
                  </div>
                </Link>

                {/* Logout Icon */}
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 sm:p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
