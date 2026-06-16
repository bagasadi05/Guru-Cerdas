import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import GreetingRobot from './GreetingRobot';
import { MenuIcon } from './Icons';
import { useOnboarding, OnboardingTour } from './ui/OnboardingTour';
import { InteractiveTutorialProvider, TutorialPicker } from './ui/InteractiveTutorial';
import { SearchTrigger } from './SearchSystem';
import { SkipLinks } from './AccessibilityComponents';
import { UploadProgressIndicator } from './ui/PerformanceIndicators';
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
import { ShellHeaderActions } from './layout/ShellHeaderActions';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showTour, endTour } = useOnboarding();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

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
    await queryClient.invalidateQueries({ type: 'active' });
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

      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-slate-500/5 rounded-full blur-[100px]"></div>
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
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isMobileSidebarOpen ? 'block' : 'hidden lg:block'}`}
        id="main-navigation"
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

          <div className="relative z-10 flex items-center gap-3 w-full">
            {/* Mobile hamburger: opens the main sidebar */}
            {isMobile && (
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-black/5 bg-white/50 transition-all hover:bg-white dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
                aria-label="Buka menu navigasi"
                aria-expanded={isMobileSidebarOpen}
                aria-controls="main-navigation"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            )}

            {/* Search button */}
            <div id="search" className="hidden sm:block">
              <SearchTrigger className="hidden sm:flex" />
            </div>

            {/* Mobile search icon */}
            <div className="sm:hidden">
              <SearchTrigger iconOnly={true} />
            </div>

            <ShellHeaderActions
              user={user}
              onOpenTutorial={() => setIsTutorialOpen(true)}
            />
          </div>
        </header>

        <main
          id="main-content"
          className={`flex-1 overflow-hidden ${isMobile && isLandscape ? 'pl-16' : ''}`}
          role="main"
        >
          <PullToRefresh
            onRefresh={handleRefresh}
            className="h-full mobile-content-safe lg:pb-6 px-4 lg:px-8 pt-4 lg:pt-6"
          >
            <div className="max-w-7xl mx-auto h-full">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={location.pathname} 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="h-full"
                >
                  {children}
                </motion.div>
              </AnimatePresence>
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

      {/* Tutorial Picker Modal */}
      <TutorialPicker
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {/* Onboarding Tour Overlay */}
      <OnboardingTour isOpen={showTour} onComplete={endTour} />
    </div>
  );
};

const LayoutWithTutorial: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  return (
    <InteractiveTutorialProvider onNavigate={(path) => navigate(path)}>
      <Layout>{children}</Layout>
    </InteractiveTutorialProvider>
  );
};

export default LayoutWithTutorial;
