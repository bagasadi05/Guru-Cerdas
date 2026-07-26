import React from 'react';
import { MENU_ENTRIES, isLeadershipRole } from '../navigation/menuRegistry';

export interface MobileNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * The 4 items pinned to the mobile bottom bar, derived from the shared menu
 * registry so the bar can never drift from the sidebar it belongs to.
 */
export const getMobileNavItems = (role?: string | null): MobileNavItem[] => {
  const audience = isLeadershipRole(role) ? 'leadership' : 'teacher';

  return MENU_ENTRIES.filter((entry) => entry.bar?.[audience] !== undefined)
    .sort((a, b) => (a.bar?.[audience] ?? 0) - (b.bar?.[audience] ?? 0))
    .map((entry) => ({
      href: entry.href,
      label: entry.barLabel ?? entry.label,
      icon: entry.barIcon ?? entry.icon,
    }));
};
