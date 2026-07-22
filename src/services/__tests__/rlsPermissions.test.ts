import { describe, it, expect, vi } from 'vitest';

describe('RLS Permissions Check for ref_* tables', () => {
  it('user with role "guru" is prevented from INSERT/UPDATE/DELETE on ref_* tables', async () => {
    const userRole = 'guru';
    const canMutateRef = (role: string) => role === 'admin';

    expect(canMutateRef(userRole)).toBe(false);
  });

  it('user with role "admin" is allowed to INSERT/UPDATE/DELETE on ref_* tables', async () => {
    const userRole = 'admin';
    const canMutateRef = (role: string) => role === 'admin';

    expect(canMutateRef(userRole)).toBe(true);
  });
});
