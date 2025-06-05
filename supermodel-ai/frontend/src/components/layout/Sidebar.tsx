// src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HomeIcon, ChatBubbleLeftRightIcon, ShoppingBagIcon, UserCircleIcon, CubeIcon,
  ChevronDoubleLeftIcon, ChevronDoubleRightIcon, PlusCircleIcon, CogIcon // Added CogIcon
} from '@heroicons/react/24/outline';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  text: string;
  isCollapsed: boolean;
  exact?: boolean; // For NavLink's 'end' prop
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, text, isCollapsed, exact = false }) => (
  <li>
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `flex items-center p-2.5 my-1 rounded-lg transition-colors duration-150 ease-in-out group
        ${isCollapsed ? 'justify-center' : ''}
        ${isActive
          ? 'bg-primary-100 dark:bg-primary-600 text-primary-600 dark:text-primary-50 shadow-sm'
          : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white'
        }`
      }
      title={text}
    >
      <span className={`h-6 w-6 ${isCollapsed ? '' : 'mr-3'} transition-transform duration-200 group-hover:scale-110`}>{icon}</span>
      {!isCollapsed && <span className="text-sm font-medium">{text}</span>}
    </NavLink>
  </li>
);

const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
    localStorage.setItem('sidebarCollapsed', String(!isCollapsed));
  };

  const navItems = [
    { to: '/dashboard', icon: <HomeIcon />, text: 'Dashboard', exact: true },
    { to: '/chat', icon: <ChatBubbleLeftRightIcon />, text: 'Chat' },
    { to: '/marketplace', icon: <ShoppingBagIcon />, text: 'Marketplace' },
    { to: '/my-skill-packs', icon: <CubeIcon />, text: 'My Skill Packs' },
    { to: '/profile', icon: <UserCircleIcon />, text: 'Profile' },
  ];
   const bottomNavItems = [
    { to: '/settings', icon: <CogIcon />, text: 'Settings' }, // Example settings link
  ];


  return (
    <aside className={`bg-white dark:bg-neutral-800 shadow-lg transition-width duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'} h-screen flex flex-col print:hidden`}>
      {/* Header part of sidebar for toggle */}
      <div className={`flex items-center h-16 border-b border-neutral-200 dark:border-neutral-700 ${isCollapsed ? 'justify-center px-2' : 'justify-end px-4'}`}>
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 focus:outline-none"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronDoubleRightIcon className="h-6 w-6" /> : <ChevronDoubleLeftIcon className="h-6 w-6" />}
        </button>
      </div>

      {/* Main navigation */}
      <nav className="flex-grow p-2 space-y-1 overflow-y-auto">
        <ul>
          {navItems.map((item) => (
            <NavItem key={item.text} {...item} isCollapsed={isCollapsed} />
          ))}
        </ul>
      </nav>

      {/* New Chat Button - always visible at bottom of scrollable nav area */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
         <NavLink
            to="/chat?new=true"
            className={`flex items-center p-2.5 rounded-lg transition-colors duration-150 ease-in-out w-full group
                ${isCollapsed ? 'justify-center' : ''}
                bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white shadow-md hover:shadow-lg`}
            title="New Chat"
        >
            <PlusCircleIcon className={`h-6 w-6 ${isCollapsed ? '' : 'mr-2'} transition-transform duration-200 group-hover:scale-110`} />
            {!isCollapsed && <span className="text-sm font-medium">New Chat</span>}
        </NavLink>
      </div>

      {/* Bottom navigation items (e.g., Settings) */}
      <nav className="p-2 space-y-1 border-t border-neutral-200 dark:border-neutral-700">
        <ul>
            {bottomNavItems.map((item) => (
                <NavItem key={item.text} {...item} isCollapsed={isCollapsed} />
            ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
