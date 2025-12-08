import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Portal Guru Storybook Configuration
 * 
 * This configuration sets up Storybook with all necessary addons for
 * comprehensive component documentation including accessibility testing,
 * interactive controls, and automatic documentation generation.
 */
const config: StorybookConfig = {
  stories: [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  addons: [
    // Core addons for component documentation
    "@storybook/addon-docs",
    
    // Accessibility testing addon
    "@storybook/addon-a11y",
    
    // Testing integration
    "@storybook/addon-vitest",
    
    // Visual regression testing
    "@chromatic-com/storybook",
    
    // Onboarding guide for new users
    "@storybook/addon-onboarding"
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {
      // Enable strict mode for better error detection
      strictMode: true,
    }
  },
  docs: {
    // Enable automatic documentation generation for all components
    autodocs: 'tag',
    // Set default documentation page
    defaultName: 'Documentation',
  },
  // Serve static assets from public directory
  staticDirs: ['../public'],
  
  // TypeScript configuration
  typescript: {
    // Enable type checking in Storybook
    check: false, // Disable for faster builds, enable in CI
    // Use project's tsconfig
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => {
        // Filter out props from node_modules except specific ones
        if (prop.parent) {
          return !prop.parent.fileName.includes('node_modules');
        }
        return true;
      },
    },
  },
};

export default config;