import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import PageTransition from './ui/PageTransition';
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
import { setNavigationInProgress } from '../utils/navigationState';

// Enhanced Mobile Navigation Components
import { useOrientation } from '../hooks/useOrientation';
import {
  EnhancedMobileBottomNav,
  MoreMenuBottomSheet,
  LandscapeSideRail,
  getMobileNavItems,
} from './mobile';
import DashboardSidebar from './navigation/DashboardSidebar';
import { getDashboardMoreMenuItems } from './navigation/dashboardMenuConfig';
import { ShellHeaderActions } from './layout/ShellHeaderActions';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userRole } = useAuth();
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

  useEffect(() => {
    const handleOpenTutorial = () => setIsTutorialOpen(true);
    document.addEventListener('open-tutorial-picker', handleOpenTutorial);
    return () => document.removeEventListener('open-tutorial-picker', handleOpenTutorial);
  }, []);

  const dynamicMoreMenuItems = useMemo(() => {
    return getDashboardMoreMenuItems(isAdmin, userRole);
  }, [isAdmin, userRole]);

  const dynamicMobileNavItems = useMemo(() => {
    return getMobileNavItems(userRole);
  }, [userRole]);

  // Listen for real-time parent messages and show notifications
  useParentMessageNotifications();

  // Pull-to-refresh handler
  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ type: 'active' });
  }, [queryClient]);

  // Enhanced Mobile Navigation Hooks
  const { isLandscape } = useOrientation();

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(max-width: 1023px)').matches;
    }
    return false;
  });
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      return !sessionStorage.getItem('greeted');
    }
    return false;
  });

  // Track screen size for mobile navbar visibility using matchMedia (perfect sync with CSS)
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const checkMobile = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
    };
    
    // Initial check
    checkMobile(mediaQuery);
    
    // Event listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', checkMobile);
      return () => mediaQuery.removeEventListener('change', checkMobile);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(checkMobile);
      return () => mediaQuery.removeListener(checkMobile);
    }
  }, []);

  useEffect(() => {
    // Mobile state updated
  }, [isMobile]);

  const handleGreetingEnd = () => {
    setShowGreeting(false);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('greeted', 'true');
    }
  };

  const location = useLocation();

  useEffect(() => {
    setNavigationInProgress(300);
    // Blur any active element on navigation to dismiss visual keyboard
    if (document.activeElement && 'blur' in document.activeElement) {
      (document.activeElement as HTMLElement).blur();
    }
    // Force cleanup keyboard classes on navigation
    document.body.classList.remove('keyboard-visible');
    document.body.classList.remove('keyboard-hide-fab');
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950/50" style={{ height: '100dvh' }}>
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
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-overlay lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar - hidden on mobile */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-modal transform transition-transform duration-300 lg:translate-x-0 ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isMobileSidebarOpen ? 'block' : 'hidden lg:block'}`}
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
          className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-sticky transition-all duration-300"
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
              <PageTransition transitionKey={location.pathname}>
                {children}
              </PageTransition>
            </div>
          </PullToRefresh>
        </main>

        {/* Enhanced Mobile Navigation — rendered via portal to escape overflow/transform stacking contexts */}
        {isMobile && createPortal(
          <>
            <MoreMenuBottomSheet
              isOpen={isMoreMenuOpen}
              onClose={() => setIsMoreMenuOpen(false)}
              items={dynamicMoreMenuItems}
            />

            <EnhancedMobileBottomNav
              moreMenuItems={dynamicMoreMenuItems}
              navItems={dynamicMobileNavItems}
              isMoreMenuOpen={isMoreMenuOpen}
              onMoreMenuToggle={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
            />

            {isLandscape && (
              <LandscapeSideRail
                navItems={dynamicMobileNavItems}
                moreMenuItems={dynamicMoreMenuItems}
                isMoreMenuOpen={isMoreMenuOpen}
                onMoreMenuToggle={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              />
            )}
          </>,
          document.body
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
