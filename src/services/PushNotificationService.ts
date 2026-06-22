// PushNotificationService
// Manages the full lifecycle of Web Push subscriptions for a user:
// enable, disable, persistence in Supabase, and status reporting.

import { supabase } from "./supabase";
import { logger } from "./logger";

const db = supabase as any;
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

    const { error } = await db.from("push_subscriptions").upsert(
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

    const { error } = await db
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
      const { data, error } = await db
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

    const { error } = await db.from("push_subscriptions").upsert(
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

  // ─────────────────────────────────────────
  // PARENT / WALI MURID METHODS
  // ─────────────────────────────────────────

  /**
   * Subscribe the current browser for push notifications as a parent.
   * Uses the `subscribe_parent` RPC which validates the access_code server-side.
   */
  async enableForParent(accessCode: string, studentId: string): Promise<{ ok: boolean; error?: string }> {
    if (!VAPID_PUBLIC_KEY) {
      return { ok: false, error: "VITE_VAPID_PUBLIC_KEY belum diset." };
    }
    if (!accessCode || !studentId) {
      return { ok: false, error: "Kode akses atau ID siswa tidak valid." };
    }

    try {
      const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);
      const serialized = serializeSubscription(subscription);

      const { error } = await (db as any).rpc("subscribe_parent", {
        p_access_code: accessCode,
        p_student_id: studentId,
        p_endpoint: serialized.endpoint,
        p_p256dh: serialized.keys.p256dh,
        p_auth: serialized.keys.auth,
        p_user_agent: navigator.userAgent,
      });

      if (error) {
        try { await subscription.unsubscribe(); } catch { /* rollback */ }
        logger.warn("Parent push subscribe failed", "PushNotificationService", error);
        return { ok: false, error: error.message };
      }

      localStorage.setItem(`parentPushEnabled_${studentId}`, "true");
      logger.info("Parent push notification enabled", "PushNotificationService", { studentId });
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn("Parent push subscribe exception", "PushNotificationService", err);
      return { ok: false, error: msg };
    }
  }

  /**
   * Unsubscribe the current browser from parent push notifications.
   * Uses `unsubscribe_parent` RPC.
   */
  async disableForParent(accessCode: string, studentId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const state = await getPushSubscriptionState();
      const endpoint = state.subscription?.endpoint ?? null;

      if (endpoint) {
        await unsubscribeFromPush();
      }

      const { error } = await (db as any).rpc("unsubscribe_parent", {
        p_access_code: accessCode,
        p_student_id: studentId,
        p_endpoint: endpoint,
      });

      if (error) {
        logger.warn("Parent push unsubscribe failed", "PushNotificationService", error);
        return { ok: false, error: error.message };
      }

      localStorage.removeItem(`parentPushEnabled_${studentId}`);
      logger.info("Parent push notification disabled", "PushNotificationService", { studentId });
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, error: msg };
    }
  }

  /**
   * Check if this browser has an active parent push subscription for a student.
   */
  async getParentStatus(accessCode: string, studentId: string): Promise<{
    isSubscribed: boolean;
    permissionState: NotificationPermission | null;
    error?: string;
  }> {
    const permissionState = "Notification" in window ? Notification.permission : null;

    try {
      const state = await getPushSubscriptionState();
      const endpoint = state.subscription?.endpoint ?? null;

      if (!endpoint) {
        return { isSubscribed: false, permissionState };
      }

      const { data, error } = await (db as any).rpc("get_parent_subscription_status", {
        p_access_code: accessCode,
        p_student_id: studentId,
        p_endpoint: endpoint,
      });

      if (error) {
        return { isSubscribed: false, permissionState, error: error.message };
      }

      return { isSubscribed: !!data, permissionState };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { isSubscribed: false, permissionState, error: msg };
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
