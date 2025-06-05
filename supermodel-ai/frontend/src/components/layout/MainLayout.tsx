// src/components/layout/MainLayout.tsx
import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuthStore } from '../../store/authStore';

const MainLayout: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  // isLoading is true when initializeAuth is running (checking token, fetching user)
  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-neutral-100 dark:bg-neutral-900">
            {/* You can add a more sophisticated spinner component here */}
            <svg className="animate-spin h-10 w-10 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg text-neutral-600 dark:text-neutral-300">Loading Application...</p>
        </div>
    );
  }

  // If not loading and not authenticated, redirect to login
  // Store current location to redirect back after login, unless it's an auth page
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // Optional: Add any additional checks like email verification if needed
  // if (user && !user.is_email_verified) {
  //   return <Navigate to="/auth/verify-email" replace />;
  // }

  return (
    <div className="flex h-screen bg-neutral-100 dark:bg-neutral-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 bg-neutral-50 dark:bg-neutral-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
