import { useEffect, useRef } from 'react';
import { logger } from '../services/logger';
import { pushNotificationService } from '../services/PushNotificationService';
import { supabase } from '../services/supabase';

/**
 * usePushSubscriptionSync
 *
 * Replaces the old in-SW setTimeout scheduler. This hook ensures that:
 *   1. Whenever a user logs in, the existing push subscription (if any) is
 *      persisted in the `push_subscriptions` table.
 *   2. If the SW reports a subscription change event, the client re-syncs
 *      its subscription with the server.
 *
 * Note: scheduling of notifications is now server-side. The Supabase
 * `dispatch-push` Edge Function (triggered by pg_cron) is responsible for
 * sending Web Push messages to subscribed users.
 */
export const usePushSubscriptionSync = (userId: string | null | undefined) => {
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    if (lastUserIdRef.current === userId) return;
    lastUserIdRef.current = userId;

    void pushNotificationService.sync(userId).catch((err) => {
      logger.warn('Push subscription sync on login failed', 'PushSubscriptionSync', err);
    });

    // Otomatis meminta izin notifikasi segera setelah PWA diinstal
    const handleAppInstalled = () => {
      logger.info('PWA installed, automatically requesting push permission...', 'PushSubscriptionSync');
      void pushNotificationService.enable(userId).catch(err => {
        logger.warn('Auto push subscription after install failed', 'PushSubscriptionSync', err);
      });
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [userId]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'PUSH_SUBSCRIPTION_EXPIRED') {
        // Defer to allow Supabase auth state to settle
        setTimeout(async () => {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            void pushNotificationService.sync(user.id).catch((err) => {
              logger.warn('Push resync after expiry failed', 'PushSubscriptionSync', err);
            });
          }
        }, 1000);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);
};

// Backward-compatible alias - older code imported useScheduleNotifications.
export const useScheduleNotifications = usePushSubscriptionSync;
