import React from 'react';
import {
  MENU_ENTRIES,
  SECTION_LABELS,
  SECTION_ORDER,
  isEntryVisible,
  isLeadershipRole,
  type MenuAudience,
  type MenuSectionId,
} from './menuRegistry';

export interface DashboardMenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface DashboardMenuSection {
  id: string;
  label: string;
  items: DashboardMenuItem[];
}

/**
 * Leadership does not teach a class, so grading is not their daily entry point.
 * The mobile bottom bar has always reflected that by giving them Analitik in
 * place of Input Penilaian; the sidebar now matches. Nothing is hidden — the
 * grading screens stay reachable further down the same menu.
 */
const promoteForLeadership = (sectionId: MenuSectionId, href: string): MenuSectionId =>
  href === '/analytics' ? 'primary' : sectionId;

/**
 * Sections for the desktop sidebar, ordered as SECTION_ORDER declares.
 * Empty sections are dropped so leadership never sees a bare heading.
 */
export const getDashboardNavSections = (audience: MenuAudience): DashboardMenuSection[] => {
  const leadership = isLeadershipRole(audience.role);

  return SECTION_ORDER.map((sectionId) => ({
    id: sectionId,
    label: SECTION_LABELS[sectionId],
    items: MENU_ENTRIES.filter(
      (entry) =>
        isEntryVisible(entry, audience) &&
        (leadership ? promoteForLeadership(entry.section, entry.href) : entry.section) === sectionId,
    ).map(({ href, label, icon }) => ({ href, label, icon })),
  })).filter((section) => section.items.length > 0);
};

/** Items for the mobile "more" bottom sheet, in that sheet's own order. */
export const getDashboardMoreMenuItems = (audience: MenuAudience): DashboardMenuItem[] =>
  MENU_ENTRIES.filter((entry) => entry.moreOrder !== undefined && isEntryVisible(entry, audience))
    .sort((a, b) => (a.moreOrder ?? 0) - (b.moreOrder ?? 0))
    .map(({ href, label, icon }) => ({ href, label, icon }));
