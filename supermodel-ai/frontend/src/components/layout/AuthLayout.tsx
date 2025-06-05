// src/components/layout/AuthLayout.tsx
import React from 'react';
import { Link, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

const AuthLayout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-neutral-100 dark:bg-neutral-900">
            <svg className="animate-spin h-10 w-10 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300">Loading...</p>
        </div>
    );
  }

  if (isAuthenticated) {
    // Redirect to the page they were trying to access, or dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-400 via-secondary-500 to-primary-500 dark:from-primary-800 dark:via-secondary-800 dark:to-primary-700 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
         <Link to="/" className="flex justify-center items-center">
            {/* <img className="h-12 w-auto" src="/logo-white.svg" alt="SuperModel AI" /> */}
            <span className="text-4xl font-bold text-white">SuperModel</span>
            <span className="text-4xl font-bold text-sky-200 dark:text-sky-300 ml-1.5">AI</span>
         </Link>
        <h2 className="mt-3 text-center text-2xl font-semibold tracking-tight text-white">
          Access Your AI Workspace
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-neutral-800 py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10">
          <Outlet />
        </div>
      </div>
       <p className="mt-8 text-center text-sm text-neutral-100 dark:text-neutral-300">
        © {new Date().getFullYear()} SuperModel AI. All rights reserved.
      </p>
    </div>
  );
};

export default AuthLayout;
