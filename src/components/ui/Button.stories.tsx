import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

// fn mock for click handler
const fn = () => () => { };

/**
 * The Button component is a versatile, accessible button with multiple variants and sizes.
 * It includes ripple effects, sound feedback, and smooth animations.
 * 
 * ## Accessibility Features
 * - Keyboard navigation with visible focus rings
 * - Disabled state with proper cursor and opacity
 * - ARIA attributes for screen readers
 * - Focus-visible for keyboard-only focus indication
 */
const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A fully accessible button component with multiple variants, sizes, and interactive effects including ripple animations and sound feedback.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'ghost'],
      description: 'Visual style variant of the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'default' },
      },
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Size of the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'default' },
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    children: {
      control: 'text',
      description: 'Button content',
    },
  },
  args: {
    onClick: fn(),
    children: 'Button',
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default button with gradient background and hover effects.
 * This is the primary action button style.
 */
export const Default: Story = {
  args: {
    variant: 'default',
    children: 'Default Button',
  },
};

/**
 * Destructive button for dangerous actions like delete or remove.
 * Uses red color scheme to indicate caution.
 */
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

/**
 * Outline button for secondary actions.
 * Has a transparent background with a border.
 */
export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
};

/**
 * Ghost button for tertiary actions.
 * Minimal styling with hover effects.
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost Button',
  },
};

/**
 * Small size button for compact layouts.
 */
export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

/**
 * Large size button for prominent actions.
 */
export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

/**
 * Icon-only button with square dimensions.
 * Perfect for toolbar buttons or icon actions.
 */
export const Icon: Story = {
  args: {
    size: 'icon',
    children: '🔍',
  },
};

/**
 * Disabled button state.
 * Shows reduced opacity and prevents interaction.
 * 
 * **Accessibility**: Properly marked as disabled for screen readers
 * and keyboard navigation is prevented.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Button',
  },
};

/**
 * All variants displayed together for comparison.
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};

/**
 * All sizes displayed together for comparison.
 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">🔍</Button>
    </div>
  ),
};
