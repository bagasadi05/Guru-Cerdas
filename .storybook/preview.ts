import type { Preview } from '@storybook/react';
import portalGuruTheme from './theme';

/**
 * Portal Guru Storybook Preview Configuration
 * 
 * This configuration sets up the Portal Guru theme for Storybook,
 * including custom branding, controls, and documentation settings.
 */
const preview: Preview = {
  parameters: {
    // Configure interactive controls for prop editing
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true, // Expand controls panel by default
      sort: 'requiredFirst', // Show required props first
    },
    // Documentation settings
    docs: {
      toc: true, // Enable table of contents
      theme: portalGuruTheme, // Use Portal Guru custom theme
    },
    // Portal Guru branded backgrounds
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
        {
          name: 'Portal Guru Light',
          value: '#f9fafb',
        },
        {
          name: 'Portal Guru Dark',
          value: '#111827',
        },
      ],
    },
    // Action handlers for event props
    actions: { 
      argTypesRegex: '^on[A-Z].*',
    },
    // Layout configuration
    layout: 'padded',
    // Viewport configuration for responsive testing
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px',
          },
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px',
          },
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1280px',
            height: '800px',
          },
        },
      },
    },
  },
  // Enable autodocs for all stories by default
  tags: ['autodocs'],
};

export default preview;