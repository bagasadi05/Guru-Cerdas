import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PushNotificationService } from '../PushNotificationService';

// Mock dependencies
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('../logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../utils/pushSubscription', () => ({
  getPushSubscriptionState: vi.fn().mockResolvedValue({
    supported: true,
    permission: 'granted',
    subscribed: false,
    subscription: null,
    iOSPWA: false,
  }),
  serializeSubscription: vi.fn().mockReturnValue({
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    },
  }),
  subscribeToPush: vi.fn().mockResolvedValue({
    unsubscribe: vi.fn(),
    toJSON: () => ({
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key',
      },
      expirationTime: null,
    }),
  }),
  unsubscribeFromPush: vi.fn().mockResolvedValue(true),
}));

describe('PushNotificationService', () => {
  let service: PushNotificationService;
  const mockUserId = 'test-user-id-123';
  const mockStudentId = 'test-student-id-456';
  const mockAccessCode = 'test-access-code-789';

  beforeEach(() => {
    // Reset singleton
    (PushNotificationService as any).instance = null;
    service = PushNotificationService.getInstance();

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal('localStorage', localStorageMock);

    // Mock Notification
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    });

    // Mock navigator.serviceWorker
    vi.stubGlobal('navigator', {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn().mockResolvedValue(null),
            subscribe: vi.fn().mockResolvedValue({
              unsubscribe: vi.fn(),
              toJSON: () => ({
                endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
                keys: {
                  p256dh: 'test-p256dh-key',
                  auth: 'test-auth-key',
                },
                expirationTime: null,
              }),
            }),
          },
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PushNotificationService.getInstance();
      const instance2 = PushNotificationService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('isOptedInLocally', () => {
    it('should return false when localStorage is empty', () => {
      (localStorage.getItem as any).mockReturnValue(null);
      expect(service.isOptedInLocally()).toBe(false);
    });

    it('should return true when localStorage has true', () => {
      (localStorage.getItem as any).mockReturnValue('true');
      expect(service.isOptedInLocally()).toBe(true);
    });

    it('should return false when localStorage has false', () => {
      (localStorage.getItem as any).mockReturnValue('false');
      expect(service.isOptedInLocally()).toBe(false);
    });
  });

  describe('setOptedInLocally', () => {
    it('should set localStorage to true', () => {
      service.setOptedInLocally(true);
      expect(localStorage.setItem).toHaveBeenCalledWith('pushNotificationsEnabled', 'true');
    });

    it('should remove localStorage when false', () => {
      service.setOptedInLocally(false);
      expect(localStorage.removeItem).toHaveBeenCalledWith('pushNotificationsEnabled');
    });
  });

  describe('enableForParent', () => {
    it('should return error when access code is missing', async () => {
      const result = await service.enableForParent('', mockStudentId);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Kode akses atau ID siswa tidak valid');
    });

    it('should return error when student ID is missing', async () => {
      const result = await service.enableForParent(mockAccessCode, '');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Kode akses atau ID siswa tidak valid');
    });

    it('should successfully subscribe parent', async () => {
      vi.stubGlobal('import.meta', {
        env: {
          VITE_VAPID_PUBLIC_KEY: 'test-vapid-key',
        },
      });

      const { supabase } = await import('../supabase');
      (supabase.rpc as any).mockResolvedValue({
        data: { ok: true, id: 'sub-123' },
        error: null,
      });

      const result = await service.enableForParent(mockAccessCode, mockStudentId);
      expect(result.ok).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('subscribe_parent', expect.objectContaining({
        p_access_code: mockAccessCode,
        p_student_id: mockStudentId,
        p_endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        p_p256dh: 'test-p256dh-key',
        p_auth: 'test-auth-key',
      }));
    });

    it('should return error when RPC fails', async () => {
      vi.stubGlobal('import.meta', {
        env: {
          VITE_VAPID_PUBLIC_KEY: 'test-vapid-key',
        },
      });

      const { supabase } = await import('../supabase');
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Invalid access code' },
      });

      const result = await service.enableForParent(mockAccessCode, mockStudentId);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Invalid access code');
    });
  });

  describe('disableForParent', () => {
    it('should successfully unsubscribe parent', async () => {
      const { supabase } = await import('../supabase');
      (supabase.rpc as any).mockResolvedValue({
        data: { ok: true },
        error: null,
      });

      const result = await service.disableForParent(mockAccessCode, mockStudentId);
      expect(result.ok).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledWith('unsubscribe_parent', expect.objectContaining({
        p_access_code: mockAccessCode,
        p_student_id: mockStudentId,
      }));
    });

    it('should return error when RPC fails', async () => {
      const { supabase } = await import('../supabase');
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Failed to unsubscribe' },
      });

      const result = await service.disableForParent(mockAccessCode, mockStudentId);
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Failed to unsubscribe');
    });
  });

  describe('getParentStatus', () => {
    it('should return subscribed status', async () => {
      const { getPushSubscriptionState } = await import('../../utils/pushSubscription');
      (getPushSubscriptionState as any).mockResolvedValue({
        supported: true,
        permission: 'granted',
        subscribed: true,
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        },
        iOSPWA: false,
      });

      const { supabase } = await import('../supabase');
      (supabase.rpc as any).mockResolvedValue({
        data: { registered: true, is_active: true },
        error: null,
      });

      const result = await service.getParentStatus(mockAccessCode, mockStudentId);
      expect(result.isSubscribed).toBe(true);
      expect(result.permissionState).toBe('granted');
    });

    it('should return not subscribed when RPC returns false', async () => {
      const { getPushSubscriptionState } = await import('../../utils/pushSubscription');
      (getPushSubscriptionState as any).mockResolvedValue({
        supported: true,
        permission: 'granted',
        subscribed: false,
        subscription: null,
        iOSPWA: false,
      });

      const { supabase } = await import('../supabase');
      (supabase.rpc as any).mockResolvedValue({
        data: { registered: false, is_active: false },
        error: null,
      });

      const result = await service.getParentStatus(mockAccessCode, mockStudentId);
      expect(result.isSubscribed).toBe(false);
    });

    it('should return error when RPC fails', async () => {
      const { getPushSubscriptionState } = await import('../../utils/pushSubscription');
      (getPushSubscriptionState as any).mockResolvedValue({
        supported: true,
        permission: 'granted',
        subscribed: true,
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
        },
        iOSPWA: false,
      });

      const { supabase } = await import('../supabase');
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const result = await service.getParentStatus(mockAccessCode, mockStudentId);
      expect(result.error).toBe('RPC failed');
    });
  });

  describe('browser not supporting push', () => {
    it('should handle unsupported browser gracefully', async () => {
      // Mock unsupported browser
      vi.stubGlobal('navigator', {
        serviceWorker: undefined,
      });

      const { getPushSubscriptionState } = await import('../../utils/pushSubscription');
      (getPushSubscriptionState as any).mockResolvedValue({
        supported: false,
        permission: 'unsupported',
        subscribed: false,
        subscription: null,
        iOSPWA: false,
      });

      const result = await service.getStatus(mockUserId);
      expect(result.supported).toBe(false);
      expect(result.permission).toBe('unsupported');
    });
  });
});
