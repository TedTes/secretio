'use client'

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
      router.push('/login') // Redirect to home after logout
    } catch (error) {
      console.error('Logout failed:', error);
      // Still close menu and redirect on error
      setIsOpen(false);
      router.push('/login')
    }
  };

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  if (!user) return null;
  
  return (
    <div className="relative" ref={menuRef}>
      {/* User avatar button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-lg p-1"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {/* Avatar with user initial */}
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center ring-2 ring-blue-500/20">
          <span className="text-sm font-medium text-white">
            {user.email?.charAt(0).toUpperCase() || user.github_username?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        
        {/* User info (hidden on mobile) */}
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium text-white truncate max-w-32">
            {user.github_username || user.email?.split('@')[0] || 'User'}
          </div>
          <div className="text-xs text-gray-400">
            {user.role || 'Member'}
          </div>
        </div>
        
        {/* Dropdown arrow */}
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-slate-800 rounded-lg border border-gray-700 shadow-lg z-50 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-gray-700 bg-slate-750">
  <p className="text-sm text-white font-medium truncate">{user.email}</p>
  {user.github_username && (
    <p className="text-xs text-gray-400">@{user.github_username}</p>
  )}
  <p className="text-xs text-gray-400 mt-1">
    {user?.subscription?.status === 'active' 
      ? '🔐 Vault Pro Member' 
      : 'Free Plan'
    }
  </p>
</div>
          
          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => handleNavigation('/dashboard')}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
              <span>Dashboard</span>
            </button>
            
            <button
              onClick={() => handleNavigation('/scan/history')}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Scan History</span>
            </button>
            
            <button
              onClick={() => handleNavigation('/vault')}
              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Vault</span>
            </button>
            
            <button
  onClick={() => {
    // Show a toast or alert instead of navigating
    alert('Settings page coming soon! 🚧');
  }}
  className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-slate-700/50 transition-colors flex items-center space-x-2 cursor-not-allowed"
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
  <span>Settings</span>
  <span className="ml-auto text-xs bg-yellow-600/20 text-yellow-400 px-2 py-0.5 rounded">Soon</span>
</button>

            {/* Divider */}
            <div className="border-t border-gray-700 my-1"></div>
            
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-red-600/10 hover:text-red-200 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}