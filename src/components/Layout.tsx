import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import ThemeToggle from './ui/ThemeToggle';
import GreetingRobot from './GreetingRobot';
import { NotificationCenter, useNotifications } from './ui/NotificationCenter';
import { useOnboarding } from './ui/OnboardingTour';
import { SearchTrigger } from './SearchSystem';
import { SkipLinks } from './ui/AccessibilityFeatures';
import { KeyboardShortcutsPanel } from './ui/KeyboardShortcuts';
import {
  NetworkQualityIndicator,
  EnhancedSyncStatus,
  UploadProgressIndicator,
} from './ui/PerformanceIndicators';
import { useParentMessageNotifications } from '../hooks/useParentMessageNotifications';
import PullToRefresh from './ui/PullToRefresh';
import { useQueryClient } from '@tanstack/react-query';

// Enhanced Mobile Navigation Components
import { useOrientation } from '../hooks/useOrientation';
import {
  EnhancedMobileBottomNav,
  MoreMenuBottomSheet,
  LandscapeSideRail,
  mobileNavItems,
} from './mobile';
import DashboardSidebar from './navigation/DashboardSidebar';
import { getDashboardMoreMenuItems } from './navigation/dashboardMenuConfig';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll } =
    useNotifications();
  useOnboarding(); // Hook used for side effects

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (data?.role === 'admin') {
        setIsAdmin(true);
      }
    };
    checkAdmin();
  }, [user]);

  const dynamicMoreMenuItems = useMemo(() => {
    return getDashboardMoreMenuItems(isAdmin);
  }, [isAdmin]);

  // Listen for real-time parent messages and show notifications
  useParentMessageNotifications();

  // Pull-to-refresh handler
  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
  }, [queryClient]);

  // Enhanced Mobile Navigation Hooks
  const { isPortrait, isLandscape } = useOrientation();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      return !sessionStorage.getItem('greeted');
    }
    return false;
  });

  // Track screen size for mobile navbar visibility
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Ensure proper mobile navbar behavior (only needed for < lg breakpoint)
  useEffect(() => {
    const handleResize = () => {
      const navbar = document.querySelector('.mobile-bottom-nav') as HTMLElement;
      if (navbar) {
        // Only show on mobile (< 1024px)
        if (window.innerWidth >= 1024) {
          navbar.style.setProperty('display', 'none', 'important');
        } else {
          navbar.style.setProperty('display', 'block', 'important');
        }
      }
    };

    // Run immediately
    handleResize();

    // Run after a short delay to ensure DOM is ready
    const timer = setTimeout(handleResize, 100);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const handleGreetingEnd = () => {
    setShowGreeting(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('greeted', 'true');
    }
  };

  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950/50">
      {/* Accessibility: Skip Links */}
      <SkipLinks />

      {/* Keyboard Shortcuts Panel */}
      <KeyboardShortcutsPanel />

      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-green-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px]"></div>
      </div>

      {showGreeting && user && (
        <GreetingRobot userName={user.name} onAnimationEnd={handleGreetingEnd} />
      )}

      {/* Onboarding Tour managed globally via TourProvider */}

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar - hidden on mobile */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        id="navigation"
        role="navigation"
        aria-label="Main navigation"
      >
        <DashboardSidebar
          isAdmin={isAdmin}
          onLinkClick={() => setIsMobileSidebarOpen(false)}
        />
      </div>

      <div className="flex flex-col flex-1 w-full overflow-hidden relative z-10">
        {/* Header */}
        <header
          className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-20 transition-all duration-300"
          role="banner"
        >
          <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/20 dark:border-white/5 shadow-sm"></div>

          <div className="relative z-10 flex items-center gap-4 w-full">
            {/* Search button */}
            <div id="search">
              <SearchTrigger className="hidden sm:flex" />
            </div>

            {/* Mobile search icon */}
            <div className="sm:hidden">
              <SearchTrigger className="!w-10 !h-10 !p-0 justify-center" />
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {/* Theme Toggle */}
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 transition-all">
                <ThemeToggle />
              </div>

              {/* Network Quality Indicator - Desktop only */}
              <div className="hidden md:block">
                <NetworkQualityIndicator size="sm" showLabel={true} />
              </div>

              {/* Enhanced Sync Status */}
              <EnhancedSyncStatus showDetails={true} />

              {/* Notification Center */}
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-black/5 dark:border-white/10 transition-all">
                <NotificationCenter
                  notifications={notifications}
                  onMarkAsRead={markAsRead}
                  onMarkAllAsRead={markAllAsRead}
                  onDelete={deleteNotification}
                  onClearAll={clearAll}
                />
              </div>

              {/* Profile */}
              <Link
                to="/pengaturan"
                className="flex items-center justify-center w-10 h-10 rounded-full transition-transform hover:scale-105 active:scale-95 ml-1 ring-2 ring-white dark:ring-slate-800 shadow-md"
                aria-label="Settings"
              >
                <img
                  className="w-full h-full rounded-full object-cover"
                  src={user?.avatarUrl}
                  alt="User avatar"
                />
              </Link>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className={`flex-1 overflow-hidden ${isMobile && isLandscape ? 'pl-16' : ''}`}
          role="main"
        >
          <PullToRefresh
            onRefresh={handleRefresh}
            className="h-full pb-20 lg:pb-6 px-4 lg:px-8 pt-4 lg:pt-6"
          >
            <div className="max-w-7xl mx-auto h-full">
              <div key={location.pathname} className="animate-page-transition h-full">
                {children}
              </div>
            </div>
          </PullToRefresh>
        </main>

        {/* Enhanced Mobile Navigation */}
        {isMobile && (
          <>
            {/* Bottom Sheet for More Menu */}
            <MoreMenuBottomSheet
              isOpen={isMoreMenuOpen}
              onClose={() => setIsMoreMenuOpen(false)}
              items={dynamicMoreMenuItems}
            />

            {/* Portrait Mode: Enhanced Bottom Navigation */}
            {isPortrait && (
              <EnhancedMobileBottomNav
                moreMenuItems={dynamicMoreMenuItems}
                isMoreMenuOpen={isMoreMenuOpen}
                onMoreMenuToggle={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              />
            )}

            {/* Landscape Mode: Side Rail Navigation */}
            {isLandscape && (
              <LandscapeSideRail
                navItems={mobileNavItems}
                moreMenuItems={dynamicMoreMenuItems}
                isMoreMenuOpen={isMoreMenuOpen}
                onMoreMenuToggle={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              />
            )}
          </>
        )}
      </div>

      {/* Upload Progress Indicator - Floating */}
      <UploadProgressIndicator />
    </div>
  );
};

export default Layout;
