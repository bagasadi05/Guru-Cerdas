/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase, clearStaleAuthTokens } from '../services/supabase';
import type { User, Session, AuthResponse, UserResponse } from '@supabase/supabase-js';
import type { Database } from '../services/database.types';
import { getStudentAvatar } from '../utils/avatarUtils';
import { useToast } from './useToast';
import { logger } from '../services/logger';

/**
 * Represents an authenticated application user with profile information
 */
interface AppUser {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email?: string;
  /** User's display name */
  name: string;
  /** Name of the school the user belongs to */
  school_name?: string;
  /** URL to the user's avatar image */
  avatarUrl: string;
}

/**
 * Schedule entry with optional class name information
 */
type ScheduleWithClassName = Database['public']['Tables']['schedules']['Row'] & {
  /** Optional class name associated with the schedule */
  className?: string;
};

/**
 * Request notification permission for web/PWA
 */
const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    if (!('Notification' in window)) {
      logger.info('Notifications not supported in this browser', 'Auth');
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    logger.error('Error requesting notification permission', error as Error, undefined, 'Auth');
    return false;
  }
};

/**
 * Schedule notifications via service worker for PWA
 */
const scheduleNotifications = async (schedule: ScheduleWithClassName[]): Promise<boolean> => {
  return await setupServiceWorker(schedule);
};

/**
 * Uses the active service worker registration for web notifications
 */
const setupServiceWorker = async (schedule?: ScheduleWithClassName[]): Promise<boolean> => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();

      if (schedule && registration?.active) {
        registration.active.postMessage({
          type: 'SCHEDULE_UPDATED',
          payload: schedule,
        });
      } else if (!registration?.active) {
        logger.warn('Service worker aktif belum tersedia untuk sinkronisasi notifikasi', 'Auth');
      }
      return !!registration?.active;
    } catch (error) {
      logger.error('Service Worker not ready', error as Error, undefined, 'Auth');
      return false;
    }
  }
  return false;
};

// --- Auth Context and Provider ---

/**
 * Authentication context type providing user session management and notification controls
 */
interface AuthContextType {
  /** Current Supabase session, null if not authenticated */
  session: Session | null;
  /** Current authenticated user with profile data, null if not authenticated */
  user: AppUser | null;
  /** Current user's role from user_roles table (e.g. 'admin', 'teacher') */
  userRole: string | null;
  /** Convenience boolean indicating if the current user is an admin */
  isAdmin: boolean;
  /** Indicates whether authentication state is being loaded */
  loading: boolean;
  /** Indicates whether schedule notifications are enabled */
  isNotificationsEnabled: boolean;
  /** Authenticates a user with email and password */
  login: (email: string, password?: string) => Promise<AuthResponse>;
  /** Signs out the current user and disables notifications */
  logout: () => Promise<void>;
  /** Updates the current user's profile information */
  updateUser: (data: { name?: string; school_name?: string; avatar_url?: string; password?: string }) => Promise<UserResponse>;
  /** Registers a new user account */
  signup: (name: string, email: string, password?: string) => Promise<AuthResponse>;
  /** Enables push notifications for schedule reminders */
  enableScheduleNotifications: (schedule: ScheduleWithClassName[]) => Promise<boolean>;
  /** Disables push notifications for schedule reminders */
  disableScheduleNotifications: () => Promise<void>;
}

/**
 * React context for authentication state and operations
 * @internal
 */
export const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Authentication provider component that manages user session state and authentication operations
 * 
 * This component provides authentication context to all child components, including:
 * - User session management with Supabase
 * - Login, logout, and signup operations
 * - User profile updates
 * - Schedule notification management
 * - Automatic session persistence and restoration
 * 
 * @param props - Component props
 * @param props.children - Child components that will have access to authentication context
 * 
 * @example
 * ```typescript
 * import { AuthProvider } from './hooks/useAuth';
 * 
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <YourApp />
 *     </AuthProvider>
 *   );
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toast = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      // Check both flags for backward compatibility: the legacy key used by
      // enableScheduleNotifications() and the newer key from PushNotificationService.
      return localStorage.getItem('scheduleNotificationsEnabled') === 'true'
          || localStorage.getItem('pushNotificationsEnabled') === 'true';
    }
    return false;
  });

  const loading = !sessionLoaded || (!!session && !roleLoaded);

  /**
   * Processes raw Supabase user data into application user format
   * 
   * Transforms Supabase User object into AppUser format with proper avatar URL handling
   * and cache-busting for Supabase-hosted images.
   * 
   * @param authUser - Supabase user object or null
   * @returns Processed AppUser object or null if no user provided
   * @internal
   */
  const processUser = (authUser: User | undefined | null): AppUser | null => {
    if (!authUser) return null;

    let avatarUrl = getStudentAvatar(
      authUser.user_metadata.avatar_url,
      null,
      authUser.id,
      authUser.user_metadata.name || authUser.email || 'Guru'
    );

    if (avatarUrl && avatarUrl.includes('supabase.co')) {
      avatarUrl = `${avatarUrl.split('?')[0]}?t=${new Date().getTime()}`;
    }

    return {
      id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata.name || 'Guru',
      school_name: authUser.user_metadata.school_name || '',
      avatarUrl: avatarUrl
    };
  };

  // 1. Fetch user role when session becomes available
  useEffect(() => {
    let active = true;
    const fetchUserRole = async (userId: string) => {
      logger.debug(`fetchUserRole started for: ${userId}`, 'Auth');
      setRoleLoaded(false);
      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role, is_approved')
          .eq('user_id', userId)
          .single();
        
        logger.debug(`fetchUserRole fetched: role=${data?.role}, is_approved=${data?.is_approved}, error=${error?.message || 'none'}`, 'Auth');
        if (active) {
          if (!error && data) {
            if (data.is_approved === false) {
              await supabase.auth.signOut();
              toast.error('Akun Anda belum disetujui oleh Admin. Silakan hubungi Admin untuk persetujuan.');
              setSession(null);
              setUser(null);
              setUserRole(null);
            } else {
              setUserRole(data.role);
            }
          } else {
            setUserRole(null);
          }
          setRoleLoaded(true);
        }
      } catch (err) {
        console.error('[Auth] Error fetching user role:', err);
        logger.error('Error fetching user role', err as Error, undefined, 'Auth');
        if (active) {
          setUserRole(null);
          setRoleLoaded(true);
        }
      }
    };

    if (session?.user?.id) {
      void fetchUserRole(session.user.id);
    } else {
      setUserRole(null);
      setRoleLoaded(false);
    }

    return () => {
      active = false;
    };
  }, [session?.user?.id, toast]);

  // 2. Initialize session and listen for auth state changes
  useEffect(() => {
    logger.debug('initializing session listener', 'Auth');
    const fetchSession = async () => {
      try {
        logger.debug('calling supabase.auth.getSession()', 'Auth');
        const { data, error } = await supabase.auth.getSession();
        logger.debug(`getSession finished, session: ${!!data?.session}, error: ${error?.message || 'none'}`, 'Auth');
        if (error) {
          logger.error('Error fetching session', error as unknown as Error, undefined, 'Auth');
          // A failed/expired refresh token leaves the client in a broken state.
          // Clear the stale token and reset to a clean logged-out state.
          const message = error.message?.toLowerCase() ?? '';
          if (message.includes('refresh') || message.includes('token') || error.status === 400) {
            console.warn('[Auth] Expired or invalid refresh token detected, clearing tokens...');
            clearStaleAuthTokens();
            await supabase.auth.signOut().catch(() => undefined);
            setSession(null);
            setUser(null);
            setUserRole(null);
            setSessionLoaded(true);
            return;
          }
        }
        setSession(data.session);
        setUser(processUser(data.session?.user));
      } catch (err) {
        console.error('[Auth] Unexpected error in fetchSession:', err);
        logger.error('Unexpected error fetching session', err as Error, undefined, 'Auth');
        setSession(null);
        setUser(null);
        setUserRole(null);
      } finally {
        setSessionLoaded(true);
      }
    };

    fetchSession();

    logger.debug('Registering onAuthStateChange listener', 'Auth');
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug(`onAuthStateChange callback: event=${event}, session=${!!session}`, 'Auth');
      // When a token refresh fails, Supabase emits SIGNED_OUT with a null session.
      // Clean up any leftover stale tokens so the next load starts fresh.
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        console.warn('[Auth] Sign out or token refresh failure, clearing tokens...');
        clearStaleAuthTokens();
        setUserRole(null);
      }
      setSession(session);
      setUser(processUser(session?.user));
    });

    return () => {
      logger.debug('unsubscribing from auth state changes', 'Auth');
      subscription?.unsubscribe();
    };
  }, []);

  const enableScheduleNotifications = useCallback(async (schedule: ScheduleWithClassName[]): Promise<boolean> => {
    try {
      // Request permission using the appropriate method for platform
      const permissionGranted = await requestNotificationPermission();

      if (!permissionGranted) {
        toast.warning('Izin notifikasi tidak diberikan.');
        return false;
      }

      // Schedule notifications using the appropriate method for platform
      const success = await scheduleNotifications(schedule);

      if (success) {
        localStorage.setItem('scheduleNotificationsEnabled', 'true');
        setIsNotificationsEnabled(true);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error enabling notifications', error as Error, undefined, 'Auth');
      toast.error('Gagal mengaktifkan notifikasi.');
      return false;
    }
  }, [toast]);

  const disableScheduleNotifications = useCallback(async () => {
    try {
      if ('serviceWorker' in navigator) {
        // Clear service worker notifications on web/PWA
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.active) {
          registration.active.postMessage({ type: 'CLEAR_SCHEDULE' });
        }
      }
    } catch (error) {
      logger.error('Failed to clear notifications', error as Error, undefined, 'Auth');
    }
    localStorage.removeItem('scheduleNotificationsEnabled');
    setIsNotificationsEnabled(false);
  }, []);

  const clearSupabaseCache = async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active) {
        registration.active.postMessage({ type: 'CLEAR_SUPABASE_CACHE' });
      }
    }

    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key === 'supabase-api-cache').map(key => caches.delete(key)));
    }
  };

  const value: AuthContextType = useMemo(() => ({
    session,
    user,
    userRole,
    isAdmin: userRole === 'admin',
    loading,
    isNotificationsEnabled,
    login: (email, password) => supabase.auth.signInWithPassword({ email: email!, password: password! }),
    signup: (name, email, password) => supabase.auth.signUp({
      email: email,
      password: password!,
      options: {
        data: {
          name,
          full_name: name,
          avatar_url: getStudentAvatar(null, null, email, name)
        },
        emailRedirectTo: window.location.origin
      }
    }),
    logout: async () => {
      await disableScheduleNotifications();
      await supabase.auth.signOut();
      await clearSupabaseCache();
    },
    updateUser: (data) => supabase.auth.updateUser({
      password: data.password,
      data: {
        name: data.name,
        school_name: data.school_name,
        avatar_url: data.avatar_url
      }
    }),
    enableScheduleNotifications,
    disableScheduleNotifications,
  }), [session, user, userRole, loading, isNotificationsEnabled, enableScheduleNotifications, disableScheduleNotifications]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook for accessing authentication state and operations
 * 
 * Provides access to the current user session, authentication operations (login, logout, signup),
 * user profile management, and schedule notification controls. Must be used within an AuthProvider.
 * 
 * @returns Authentication context with session state and operations
 * @throws {Error} If used outside of AuthProvider
 * 
 * @example
 * ```typescript
 * import { useAuth } from './hooks/useAuth';
 * 
 * function MyComponent() {
 *   const { user, login, logout, loading } = useAuth();
 * 
 *   if (loading) return <div>Loading...</div>;
 * 
 *   if (!user) {
 *     return (
 *       <button type="button" onClick={() => login('user@example.com', 'password')}>
 *         Login
 *       </button>
 *     );
 *   }
 * 
 *   return (
 *     <div>
 *       <p>Welcome, {user.name}!</p>
 *       <button type="button" onClick={logout}>Logout</button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Enable schedule notifications
 * const { enableScheduleNotifications, isNotificationsEnabled } = useAuth();
 * 
 * const handleEnableNotifications = async () => {
 *   const success = await enableScheduleNotifications(scheduleData);
 *   if (success) {
 *     console.log('Notifications enabled');
 *   }
 * };
 * ```
 * 
 * @since 1.0.0
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
