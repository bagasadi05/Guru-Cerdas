import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import NotificationsSection from '../../src/components/settings/NotificationsSection';

const f = vi.hoisted(() => ({
    online: true,
    sync: vi.fn(), save: vi.fn(), success: vi.fn(), error: vi.fn(),
    prefs: { taskReminders: true, taskReminderDays: 1, dailyDigest: false, attendanceReminders: true, messageNotifications: true },
}));
vi.mock('../../src/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'teacher-a' } }) }));
vi.mock('../../src/hooks/useToast', () => ({ useToast: () => ({ success: f.success, error: f.error, info: vi.fn(), warning: vi.fn() }) }));
vi.mock('../../src/hooks/useOfflineStatus', () => ({ useOfflineStatus: () => f.online }));
vi.mock('../../src/utils/i18n', () => ({ useI18n: () => ({ language: 'id' }) }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({ data: [] }) }));
vi.mock('../../src/services/notificationPreferenceSync', () => ({ syncNotificationPreferences: f.sync, saveAccountNotificationPreferences: f.save }));
vi.mock('../../src/services/PushNotificationService', () => ({ pushNotificationService: {
    getStatus: async () => ({ supported: true, permission: 'default', subscribed: false, enabled: false, serverRegistered: false }),
} }));

beforeEach(() => {
    f.online = true;
    f.sync.mockReset().mockResolvedValue(f.prefs);
    f.save.mockReset().mockResolvedValue({ ...f.prefs, taskReminders: false });
    f.success.mockClear(); f.error.mockClear();
});

describe('reminder account settings UI', () => {
    it('uses calendar-day options and reports successful server persistence', async () => {
        render(<NotificationsSection />);
        const control = screen.getByRole('checkbox', { name: 'Pengingat Tugas' });
        await waitFor(() => expect(control).not.toBeDisabled());
        expect(screen.getByRole('option', { name: 'Hari ini' })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: '6 jam' })).not.toBeInTheDocument();
        fireEvent.click(control);
        await waitFor(() => expect(f.save).toHaveBeenCalledWith('teacher-a', { taskReminders: false }));
        await waitFor(() => expect(f.success).toHaveBeenCalledWith('Preferensi notifikasi disimpan.'));
    });
    it('preserves the previous setting and displays a failed save', async () => {
        f.save.mockRejectedValue(new Error('network failed'));
        render(<NotificationsSection />);
        const control = screen.getByRole('checkbox', { name: 'Pengingat Tugas' });
        await waitFor(() => expect(control).not.toBeDisabled());
        fireEvent.click(control);
        await waitFor(() => expect(f.error).toHaveBeenCalled());
        expect(control).toBeChecked();
        expect(f.success).not.toHaveBeenCalled();
    });
    it('disables account controls offline and explains how to save', async () => {
        f.online = false;
        render(<NotificationsSection />);
        expect(screen.getByText('Hubungkan internet untuk menyimpan preferensi akun.')).toBeInTheDocument();
        const control = screen.getByRole('checkbox', { name: 'Pengingat Tugas' });
        await waitFor(() => expect(f.sync).toHaveBeenCalled());
        expect(control).toBeDisabled();
        expect(f.save).not.toHaveBeenCalled();
    });
});
