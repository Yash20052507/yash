// src/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const NotFoundPage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center px-4 py-8"> {/* Adjusted min-h for typical navbar+footer height */}
      <ExclamationTriangleIcon className="h-20 w-20 sm:h-24 sm:w-24 text-primary-500 dark:text-primary-400 mb-6 animate-pulse" />
      <h1 className="text-4xl sm:text-5xl font-bold text-neutral-800 dark:text-neutral-100 mb-3">404</h1>
      <h2 className="text-xl sm:text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4">Page Not Found</h2>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md text-sm sm:text-base">
        Oops! The page you are looking for does not exist, might have been moved, or you don't have permission to view it.
      </p>
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
        <Link
          to="/dashboard"
          className="px-6 py-2.5 rounded-md text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition-colors"
        >
          Go to Dashboard
        </Link>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2.5 rounded-md text-sm font-medium bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 transition-colors"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
