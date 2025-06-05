// src/pages/dashboard/DashboardPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSessionStore } from '../../store/sessionStore'; // To get session count
import { useSkillPackStore } from '../../store/skillPackStore'; // To get user skill pack count
import { ArrowRightIcon, ChatBubbleLeftRightIcon, ShoppingBagIcon, CubeIcon } from '@heroicons/react/24/outline';

const StatCard: React.FC<{ title: string; value: string | number; linkTo?: string; linkText?: string; isLoading?: boolean }> =
({ title, value, linkTo, linkText, isLoading }) => (
  <div className="bg-white dark:bg-neutral-800 shadow-lg rounded-lg p-6 transform transition-all hover:scale-105">
    <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 truncate">{title}</h3>
    {isLoading ? (
        <div className="mt-2 h-8 w-1/3 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"></div>
    ) : (
        <p className="mt-2 text-3xl font-semibold text-primary-600 dark:text-primary-400">{value}</p>
    )}
    {linkTo && linkText && !isLoading && (
      <Link to={linkTo} className="mt-4 inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 group">
        {linkText}
        <ArrowRightIcon className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    )}
  </div>
);

const QuickLinkCard: React.FC<{ title: string; description: string; linkTo: string; icon: React.ReactNode }> =
({ title, description, linkTo, icon }) => (
  <Link to={linkTo} className="block bg-white dark:bg-neutral-800 shadow-lg rounded-lg p-6 hover:shadow-xl hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all duration-200 ease-in-out group">
    <div className="flex items-center space-x-4">
      <div className="flex-shrink-0 p-3 bg-primary-100 dark:bg-primary-700 rounded-full group-hover:scale-110 transition-transform">
        {React.cloneElement(icon as React.ReactElement, { className: "h-7 w-7 text-primary-600 dark:text-primary-200"})}
      </div>
      <div>
        <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">{title}</h4>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
      </div>
    </div>
  </Link>
);


const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { sessions, isLoadingList: isLoadingSessions, fetchSessions } = useSessionStore();
  const { userOwnedSkillPacks, isLoadingUserPacks: isLoadingMyPacks, fetchUserSkillPacks } = useSkillPackStore();

  React.useEffect(() => {
    fetchSessions();
    fetchUserSkillPacks();
  }, [fetchSessions, fetchUserSkillPacks]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Welcome back, <span className="text-primary-600 dark:text-primary-400">{user?.username || 'User'}</span>!
        </h1>
        <p className="mt-2 text-lg text-neutral-600 dark:text-neutral-400">
          Here's what's happening with your SuperModel AI account.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Available Credits" value={user?.credits ?? 0} linkTo="/profile" linkText="Manage Credits" />
        <StatCard title="Active Sessions" value={sessions.length} isLoading={isLoadingSessions} linkTo="/chat" linkText="View Chats" />
        <StatCard title="My Skill Packs" value={userOwnedSkillPacks.length} isLoading={isLoadingMyPacks} linkTo="/my-skill-packs" linkText="View Skill Packs" />
      </div>

       <div>
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <QuickLinkCard
                title="Start New Chat"
                description="Jump into a new conversation with AI."
                linkTo="/chat?new=true"
                icon={<ChatBubbleLeftRightIcon />}
            />
            <QuickLinkCard
                title="Explore Marketplace"
                description="Discover new skill packs to enhance your AI."
                linkTo="/marketplace"
                icon={<ShoppingBagIcon />}
            />
             <QuickLinkCard
                title="Manage My Skill Packs"
                description="View and configure your skill packs."
                linkTo="/my-skill-packs"
                icon={<CubeIcon />}
            />
        </div>
      </div>

      {/* Recent Activity (Placeholder) */}
      <div className="bg-white dark:bg-neutral-800 shadow-lg rounded-lg p-6">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4">Recent Activity</h2>
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
          <li className="py-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Session "Project Phoenix" updated.</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">Just now</p>
          </li>
          <li className="py-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Acquired "Advanced Data Analysis" skill pack.</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">Yesterday</p>
          </li>
          <li className="py-3">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Credits refilled: +500.</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">3 days ago</p>
          </li>
        </ul>
         <div className="mt-4">
            <button onClick={() => alert("Activity page not implemented yet.")} className="text-sm font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200">
                View all activity &rarr;
            </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
