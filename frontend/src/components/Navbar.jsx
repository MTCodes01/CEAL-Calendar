import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import { getContrastColor } from '../utils/colorUtils';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavLinks = () => (
    <>
      <Link
        to="/calendar"
        onClick={() => setIsMobileMenuOpen(false)}
        className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
      >
        Calendar
      </Link>
      {user?.is_staff && (
        <Link
          to="/admin"
          onClick={() => setIsMobileMenuOpen(false)}
          className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
        >
          Admin
        </Link>
      )}
      <Link
        to="/profile"
        onClick={() => setIsMobileMenuOpen(false)}
        className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
      >
        Profile
      </Link>
      <Link
        to="/settings"
        onClick={() => setIsMobileMenuOpen(false)}
        className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all duration-200"
      >
        Settings
      </Link>
    </>
  );

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center">
            <Link to="/calendar" className="flex items-center gap-2">
              <img 
                src={theme === 'dark' ? '/logo-light.svg' : '/logo-dark.svg'} 
                alt="CEAL Calendar Logo" 
                className="h-8 w-auto object-contain"
              />
              <span className="text-xl font-bold text-gray-900 dark:text-white">CEAL Calendar</span>
            </Link>
          </div>

          <div className="flex items-center">
            <div className="flex items-center space-x-2 md:space-x-4">
              <ThemeToggle />
              
              {user && (
                <>
                  {/* Desktop Navigation */}
                  <div className="hidden md:flex items-center space-x-1 mr-2">
                    <NavLinks />
                  </div>

                  <div className="hidden md:block h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2" />

                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end justify-center text-right">
                      <span className="text-sm font-bold text-gray-900 dark:text-white leading-none whitespace-nowrap">
                        {user.first_name} {user.last_name}
                      </span>
                      <div className="flex flex-wrap justify-end gap-1 mt-1">
                        {user.club && (
                          <span 
                            className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-[24px] shadow-sm uppercase tracking-wider whitespace-nowrap"
                            style={{ backgroundColor: user.club.color, color: getContrastColor(user.club.color) }}
                          >
                            {user.club.name}
                          </span>
                        )}
                        {user.sub_club && (
                          <span 
                            className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-[24px] shadow-sm uppercase tracking-wider whitespace-nowrap"
                            style={{ backgroundColor: user.sub_club.color, color: getContrastColor(user.sub_club.color) }}
                          >
                            {user.sub_club.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-md border-2 border-white dark:border-gray-800 flex-shrink-0">
                      {user.first_name?.[0]?.toUpperCase()}{user.last_name?.[0]?.toUpperCase()}
                    </div>

                    <button
                      onClick={handleLogout}
                      title="Logout"
                      className="hidden sm:flex ml-1 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </button>
                    
                    {/* Mobile Menu Button */}
                    <button
                      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                      className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isMobileMenuOpen ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                        )}
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {user && (
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-96 border-t border-gray-100 dark:border-gray-800' : 'max-h-0'}`}>
          <div className="px-4 pt-2 pb-6 space-y-1 bg-white dark:bg-gray-900">
            <div className="flex items-center px-3 py-4 border-b border-gray-50 dark:border-gray-800 mb-2">
              <div className="flex-1">
                <p className="text-base font-bold text-gray-900 dark:text-white">
                  {user.first_name} {user.last_name}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.club && (
                    <span 
                      className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase"
                      style={{ backgroundColor: user.club.color, color: getContrastColor(user.club.color) }}
                    >
                      {user.club.name}
                    </span>
                  )}
                  {user.sub_club && (
                    <span 
                      className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase"
                      style={{ backgroundColor: user.sub_club.color, color: getContrastColor(user.sub_club.color) }}
                    >
                      {user.sub_club.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex flex-col space-y-1">
              <NavLinks />
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
