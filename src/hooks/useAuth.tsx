import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { Database } from '../services/database.types';

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
 * Sets up and registers the service worker for push notifications and offline functionality
 * 
 * This function registers the service worker located at '/sw.js' and waits for it to be ready.
 * The service worker enables push notifications for schedule reminders and offline data caching.
 * 
 * @returns Promise resolving to the ServiceWorkerRegistration if successful, null otherwise
 * 
 * @example
 * ```typescript
 * const registration = await setupServiceWorker();
 * if (registration) {
 *   console.log('Service worker registered successfully');
 * }
 * ```
 * 
 * @since 1.0.0
 */
const setupServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
}

// --- Auth Context and Provider ---

/**
 * Authentication context type providing user session management and notification controls
 */
interface AuthContextType {
  /** Current Supabase session, null if not authenticated */
  session: Session | null;
  /** Current authenticated user with profile data, null if not authenticated */
  user: AppUser | null;
  /** Indicates whether authentication state is being loaded */
  loading: boolean;
  /** Indicates whether schedule notifications are enabled */
  isNotificationsEnabled: boolean;
  /** Authenticates a user with email and password */
  login: (email: string, password?: string) => Promise<any>;
  /** Signs out the current user and disables notifications */
  logout: () => Promise<void>;
  /** Updates the current user's profile information */
  updateUser: (data: { name?: string; school_name?: string; avatar_url?: string; password?: string }) => Promise<any>;
  /** Registers a new user account */
  signup: (name: string, email: string, password?: string) => Promise<any>;
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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('scheduleNotificationsEnabled') === 'true';
    }
    return false;
  });

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

    let avatarUrl = authUser.user_metadata.avatar_url || `https://i.pravatar.cc/150?u=${authUser.id}`;

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


  useEffect(() => {
    const fetchSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error("Error fetching session:", error);
      setSession(data.session);
      setUser(processUser(data.session?.user));
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(processUser(session?.user));
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const enableScheduleNotifications = async (schedule: ScheduleWithClassName[]): Promise<boolean> => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      alert('Browser Anda tidak mendukung notifikasi.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      alert('Izin notifikasi tidak diberikan.');
      return false;
    }

    const registration = await setupServiceWorker();
    if (registration && registration.active) {
      registration.active.postMessage({
        type: 'SCHEDULE_UPDATED',
        payload: schedule,
      });
      localStorage.setItem('scheduleNotificationsEnabled', 'true');
      setIsNotificationsEnabled(true);
      return true;
    }
    return false;
  };

  const disableScheduleNotifications = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && registration.active) {
          registration.active.postMessage({ type: 'CLEAR_SCHEDULE' });
        }
      } catch (error) {
        console.error('Failed to clear notifications:', error);
      }
    }
    localStorage.removeItem('scheduleNotificationsEnabled');
    setIsNotificationsEnabled(false);
  };

  const value: AuthContextType = {
    session,
    user,
    loading,
    isNotificationsEnabled,
    login: (email, password) => supabase.auth.signInWithPassword({ email: email!, password: password! }),
    signup: (name, email, password) => supabase.auth.signUp({
      email: email,
      password: password!,
      options: {
        data: {
          name,
          avatar_url: `https://i.pravatar.cc/150?u=${email}`
        }
      }
    }),
    logout: async () => {
      await disableScheduleNotifications();
      await supabase.auth.signOut();
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
  };

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
 *       <button onClick={() => login('user@example.com', 'password')}>
 *         Login
 *       </button>
 *     );
 *   }
 * 
 *   return (
 *     <div>
 *       <p>Welcome, {user.name}!</p>
 *       <button onClick={logout}>Logout</button>
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
