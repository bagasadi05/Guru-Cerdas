// PushNotificationService
// Manages the full lifecycle of Web Push subscriptions for a user:
// enable, disable, persistence in Supabase, and status reporting.

import { supabase } from "./supabase";
import { logger } from "./logger";
import {
  getPushSubscriptionState,
  serializeSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSubscriptionState,
} from "../utils/pushSubscription";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
const STORAGE_KEY = "pushNotificationsEnabled";

export interface PushStatusResult extends PushSubscriptionState {
  enabled: boolean;
  serverRegistered: boolean;
  error?: string;
}

export class PushNotificationService {
  private static instance: PushNotificationService | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Check whether the user has opted in (in this browser) for push.
   */
  isOptedInLocally(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  setOptedInLocally(value: boolean): void {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, "true");
      else localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      logger.warn("Failed to write push opt-in flag", "PushNotificationService", err);
    }
  }

  /**
   * Request permission, subscribe via PushManager, and persist the
   * subscription in the `push_subscriptions` table.
   */
  async enable(userId: string): Promise<PushStatusResult> {
    if (!VAPID_PUBLIC_KEY) {
      throw new Error(
        "VITE_VAPID_PUBLIC_KEY belum diset. Tambahkan env var dan rebuild.",
      );
    }
    if (!userId) {
      throw new Error("User belum login.");
    }

    const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);
    const serialized = serializeSubscription(subscription);

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: serialized.endpoint,
        p256dh: serialized.keys.p256dh,
        auth: serialized.keys.auth,
        user_agent: navigator.userAgent,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) {
      // Roll back browser subscription so we don't leave a dangling sub.
      try {
        await subscription.unsubscribe();
      } catch (rollbackErr) {
        logger.warn("Rollback unsubscribe failed", "PushNotificationService", rollbackErr);
      }
      throw new Error(`Gagal menyimpan subscription: ${error.message}`);
    }

    this.setOptedInLocally(true);
    logger.info("Push notification enabled", "PushNotificationService", {
      endpoint: serialized.endpoint.slice(0, 60) + "…",
    });
    return this.getStatus(userId);
  }

  /**
   * Unsubscribe from PushManager and remove the row from the database.
   */
  async disable(userId: string): Promise<PushStatusResult> {
    if (!userId) {
      throw new Error("User belum login.");
    }
    const existing = await unsubscribeFromPush();

    const { error } = await supabase
      .from("push_subscriptions")
      .update({ is_active: false })
      .eq("user_id", userId);

    if (error) {
      logger.warn("Failed to mark subscriptions inactive", "PushNotificationService", error);
    }

    this.setOptedInLocally(false);
    return {
      ...(await getPushSubscriptionState()),
      enabled: false,
      serverRegistered: false,
    };
  }

  /**
   * Aggregated status suitable for rendering in UI.
   */
  async getStatus(userId: string | null): Promise<PushStatusResult> {
    const local = await getPushSubscriptionState();
    const enabled = this.isOptedInLocally();

    if (!userId) {
      return { ...local, enabled, serverRegistered: false };
    }

    // Confirm the server has an active row matching this endpoint.
    let serverRegistered = false;
    if (local.subscription) {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("id, is_active")
        .eq("endpoint", local.subscription.endpoint)
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        logger.warn("Failed to query server subscription", "PushNotificationService", error);
      } else {
        serverRegistered = !!data;
      }
    }

    return { ...local, enabled, serverRegistered };
  }

  /**
   * Re-sync the local subscription with the server (useful after login
   * or when subscription changes are detected).
   */
  async sync(userId: string): Promise<void> {
    if (!userId) return;
    const local = await getPushSubscriptionState();
    if (!local.subscription) return;
    const serialized = serializeSubscription(local.subscription);

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint: serialized.endpoint,
        p256dh: serialized.keys.p256dh,
        auth: serialized.keys.auth,
        user_agent: navigator.userAgent,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );

    if (error) {
      logger.warn("Push subscription sync failed", "PushNotificationService", error);
    } else {
      this.setOptedInLocally(true);
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
