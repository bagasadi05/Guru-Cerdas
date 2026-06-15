// Web Push subscription helpers for the browser.
// Handles VAPID public key conversion and PushManager subscription lifecycle.

export type PushPermissionState = NotificationPermission | "unsupported";

export interface PushSubscriptionState {
  supported: boolean;
  permission: PushPermissionState;
  subscribed: boolean;
  subscription: PushSubscription | null;
  iOSPWA: boolean;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isIOSPWAInstalled(): boolean {
  if (typeof window === "undefined") return false;
  // iOS Safari reports standalone mode via navigator.standalone
  // Other browsers expose matchMedia('(display-mode: standalone)')
  const navAny = navigator as Navigator & { standalone?: boolean };
  if (typeof navAny.standalone === "boolean") return navAny.standalone;
  return window.matchMedia?.("(display-mode: standalone)").matches ?? false;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  // Wait for the SW to be ready so we can call .pushManager
  const reg = await navigator.serviceWorker.ready;
  return reg;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await getServiceWorkerRegistration();
  if (!reg) return null;
  const sub = await reg.pushManager.getSubscription();
  return sub;
}

export async function subscribeToPush(vapidPublicKey: string): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error("Web Push tidak didukung di browser ini.");
  }
  const reg = await getServiceWorkerRegistration();
  if (!reg) {
    throw new Error("Service Worker belum siap.");
  }

  // De-duplicate: if there's an existing subscription, reuse it.
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(`Izin notifikasi ditolak (${permission}).`);
  }

  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey as BufferSource,
  });

  return subscription;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  const reg = await getServiceWorkerRegistration();
  if (!reg) return false;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return true;
  return await sub.unsubscribe();
}

export async function getPushSubscriptionState(): Promise<PushSubscriptionState> {
  const supported = isPushSupported();
  const iOSPWA = isIOSPWAInstalled();
  const permission: PushPermissionState = supported ? Notification.permission : "unsupported";
  if (!supported) {
    return {
      supported: false,
      permission: "unsupported",
      subscribed: false,
      subscription: null,
      iOSPWA,
    };
  }
  const sub = await getExistingSubscription();
  return {
    supported: true,
    permission,
    subscribed: !!sub,
    subscription: sub,
    iOSPWA,
  };
}

export function serializeSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  return {
    endpoint: json.endpoint!,
    keys: {
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
    },
    expirationTime: json.expirationTime ?? null,
  };
}
