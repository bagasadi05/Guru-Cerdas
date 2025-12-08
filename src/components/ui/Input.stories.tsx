import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

/**
 * The Input component is a text input field with validation state support.
 * It provides visual feedback for errors and maintains accessibility standards.
 * 
 * ## Accessibility Features
 * - Proper ARIA attributes (aria-invalid, aria-describedby)
 * - Focus-visible for keyboard navigation
 * - Error messages linked to input via aria-describedby
 * - Disabled state properly communicated to assistive technologies
 */
const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An accessible text input component with error state support, focus management, and dark mode compatibility.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
      description: 'HTML input type',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'text' },
      },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default text input.
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Input {...args} />
    </div>
  ),
};

/**
 * Input with a label.
 * Shows proper form field structure.
 */
export const WithLabel: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <label htmlFor="name-input" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Full Name
      </label>
      <Input id="name-input" placeholder="John Doe" />
    </div>
  ),
};

/**
 * Input with error state.
 * Shows validation feedback with proper ARIA attributes.
 * 
 * **Accessibility**: Error message is linked to input via aria-describedby
 * and announced to screen readers.
 */
export const WithError: Story = {
  args: {
    placeholder: 'Enter email...',
    error: 'Please enter a valid email address',
    id: 'email-input',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <label htmlFor="email-input" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Email
      </label>
      <Input {...args} />
    </div>
  ),
};

/**
 * Disabled input state.
 * Shows reduced opacity and prevents interaction.
 */
export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
    value: 'Cannot edit this',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <Input {...args} />
    </div>
  ),
};

/**
 * Email input type.
 * Provides email-specific keyboard on mobile devices.
 */
export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'email@example.com',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <label htmlFor="email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Email Address
      </label>
      <Input id="email" {...args} />
    </div>
  ),
};

/**
 * Password input type.
 * Masks the input value for security.
 */
export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter password',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Password
      </label>
      <Input id="password" {...args} />
    </div>
  ),
};

/**
 * Number input type.
 * Provides numeric keyboard on mobile devices.
 */
export const Number: Story = {
  args: {
    type: 'number',
    placeholder: '0',
  },
  render: (args) => (
    <div style={{ width: '300px' }}>
      <label htmlFor="age" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Age
      </label>
      <Input id="age" {...args} />
    </div>
  ),
};

/**
 * Complete form with multiple inputs.
 * Demonstrates various input types and validation states.
 */
export const FormExample: Story = {
  render: () => (
    <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <label htmlFor="form-name" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Full Name
        </label>
        <Input id="form-name" placeholder="John Doe" />
      </div>
      <div>
        <label htmlFor="form-email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Email
        </label>
        <Input id="form-email" type="email" placeholder="john@example.com" error="This email is already registered" />
      </div>
      <div>
        <label htmlFor="form-phone" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Phone Number
        </label>
        <Input id="form-phone" type="tel" placeholder="+1 (555) 000-0000" />
      </div>
      <div>
        <label htmlFor="form-password" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Password
        </label>
        <Input id="form-password" type="password" placeholder="Enter password" />
      </div>
    </div>
  ),
};

/**
 * All validation states.
 * Shows normal, error, and disabled states side by side.
 */
export const ValidationStates: Story = {
  render: () => (
    <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Normal State
        </label>
        <Input placeholder="Normal input" />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Error State
        </label>
        <Input placeholder="Input with error" error="This field is required" id="error-input" />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Disabled State
        </label>
        <Input placeholder="Disabled input" disabled value="Cannot edit" />
      </div>
    </div>
  ),
};
