// src/App.tsx
import React, { useEffect, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, initializeAuth } from './store/authStore';

import MainLayout from './components/layout/MainLayout';
import AuthLayout from './components/layout/AuthLayout';

// Actual Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ChatPage from './pages/chat/ChatPage';
import MarketplacePage from './pages/marketplace/MarketplacePage';
import MySkillPacksPage from './pages/skillpacks/MySkillPacksPage';
import ProfilePage from './pages/profile/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Settings page is still a placeholder if not explicitly created
const SettingsPagePlaceholder: React.FC = () => <div className="p-4 text-neutral-700 dark:text-neutral-300">Settings Page Placeholder: To be implemented</div>;


const GlobalLoadingSpinner: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-screen bg-neutral-100 dark:bg-neutral-900">
    <svg className="animate-spin h-12 w-12 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    <p className="mt-4 text-xl text-neutral-600 dark:text-neutral-300">SuperModel AI is Loading...</p>
  </div>
);

function App() {
  const { isLoading: isAuthLoading } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  if (isAuthLoading && useAuthStore.getState().token !== null && !useAuthStore.getState().isAuthenticated) {
    return <GlobalLoadingSpinner />;
  }

  return (
    <Suspense fallback={<GlobalLoadingSpinner />}>
      <Routes>
        {/* Authentication Routes */}
        <Route path="/auth" element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route index element={<Navigate to="login" replace />} />
        </Route>

        {/* Main Application Routes (Protected by MainLayout) */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="chat/:sessionId" element={<ChatPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="my-skill-packs" element={<MySkillPacksPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPagePlaceholder />} /> {/* Settings still placeholder */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
