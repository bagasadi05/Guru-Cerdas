import { create } from 'storybook/theming/create';

/**
 * Portal Guru Custom Storybook Theme
 * 
 * This theme configuration customizes Storybook's appearance
 * to match Portal Guru's branding and design system.
 */
export default create({
  base: 'light',
  
  // Brand
  brandTitle: 'Portal Guru',
  brandUrl: 'https://portal-guru.com',
  brandImage: '/logo.svg',
  brandTarget: '_self',
  
  // Colors
  colorPrimary: '#10b981', // Emerald-500 (primary brand color)
  colorSecondary: '#3b82f6', // Blue-500 (secondary accent)
  
  // UI
  appBg: '#f9fafb', // Gray-50
  appContentBg: '#ffffff',
  appBorderColor: '#e5e7eb', // Gray-200
  appBorderRadius: 8,
  
  // Text colors
  textColor: '#111827', // Gray-900
  textInverseColor: '#ffffff',
  textMutedColor: '#6b7280', // Gray-500
  
  // Toolbar
  barTextColor: '#6b7280',
  barSelectedColor: '#10b981',
  barBg: '#ffffff',
  
  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#d1d5db', // Gray-300
  inputTextColor: '#111827',
  inputBorderRadius: 6,
  
  // Font
  fontBase: '"Inter", system-ui, -apple-system, sans-serif',
  fontCode: '"Fira Code", "Courier New", monospace',
});
