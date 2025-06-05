// src/components/layout/Navbar.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Cog6ToothIcon, ArrowLeftOnRectangleIcon, UserCircleIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';

// Basic theme toggle (example, full implementation would need context or another store)
const ThemeToggleButton: React.FC = () => {
    const [isDarkMode, setIsDarkMode] = React.useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' ||
                   (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    React.useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    return (
        <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-1 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
            {isDarkMode ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
        </button>
    );
};


const Navbar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  return (
    <nav className="bg-white dark:bg-neutral-800 shadow-md sticky top-0 z-40 print:hidden">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              {/* Replace with an actual logo if available */}
              {/* <img className="h-8 w-auto" src="/logo.svg" alt="SuperModel AI" /> */}
              <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">SuperModel</span>
              <span className="text-2xl font-bold text-secondary-600 dark:text-secondary-400 ml-1">AI</span>
            </Link>
            {/* Future: Global Search Bar or other actions */}
          </div>
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <>
                <span className="text-sm text-neutral-700 dark:text-neutral-300 hidden sm:block">
                  Credits: <span className="font-semibold text-primary-600 dark:text-primary-500">{user.credits}</span>
                </span>
                <div className="relative">
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 focus:ring-primary-500"
                    title={user.username}
                  >
                    <UserCircleIcon className="h-8 w-8 text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-500" />
                    <span className="ml-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hidden md:block hover:text-primary-600 dark:hover:text-primary-500">{user.username}</span>
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 focus:ring-red-500"
                >
                  <ArrowLeftOnRectangleIcon className="h-6 w-6" />
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-500">
                  Login
                </Link>
                <Link to="/auth/register" className="ml-2 inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                  Sign Up
                </Link>
              </>
            )}
            <ThemeToggleButton />
            <button
                title="Settings (Placeholder)"
                className="p-1 rounded-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 focus:ring-primary-500"
                onClick={() => alert("Settings panel/page not yet implemented.")}
            >
                <Cog6ToothIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
