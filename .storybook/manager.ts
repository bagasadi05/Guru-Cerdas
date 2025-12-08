import { addons } from 'storybook/manager-api';
import portalGuruTheme from './theme';

/**
 * Portal Guru Storybook Manager Configuration
 * 
 * This configuration applies the Portal Guru theme to the
 * Storybook manager UI (sidebar, toolbar, etc.)
 */
addons.setConfig({
  theme: portalGuruTheme,
  // Panel position (bottom or right)
  panelPosition: 'bottom',
  // Show toolbar by default
  showToolbar: true,
  // Enable keyboard shortcuts
  enableShortcuts: true,
  // Show navigation panel
  showNav: true,
  // Show panel by default
  showPanel: true,
  // Initial active panel (controls for interactive prop editing)
  selectedPanel: 'storybook/controls/panel',
  // Sidebar configuration
  sidebar: {
    showRoots: true,
    collapsedRoots: [],
  },
});
