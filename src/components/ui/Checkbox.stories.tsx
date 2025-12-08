import type { Meta, StoryObj } from '@storybook/react';
import { Checkbox } from './Checkbox';

/**
 * The Checkbox component is a form control for binary choices.
 * It provides visual feedback and maintains accessibility standards.
 * 
 * ## Accessibility Features
 * - Native checkbox input for maximum compatibility
 * - Keyboard navigation (Space to toggle)
 * - Focus ring for keyboard navigation
 * - Proper checked/unchecked states
 * - Works with form labels
 */
const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An accessible checkbox component with focus management and dark mode support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled',
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default checkbox.
 */
export const Default: Story = {
  args: {},
};

/**
 * Checked checkbox.
 */
export const Checked: Story = {
  args: {
    checked: true,
  },
};

/**
 * Disabled checkbox.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

/**
 * Disabled and checked checkbox.
 */
export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true,
  },
};

/**
 * Checkbox with label.
 * Shows proper form field structure.
 * 
 * **Accessibility**: Label is clickable and properly associated with checkbox.
 */
export const WithLabel: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <Checkbox id="terms" />
      <label htmlFor="terms" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
        I agree to the terms and conditions
      </label>
    </div>
  ),
};

/**
 * Multiple checkboxes in a group.
 * Common pattern for multi-select options.
 */
export const Group: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Checkbox id="option1" defaultChecked />
        <label htmlFor="option1" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
          Option 1
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Checkbox id="option2" />
        <label htmlFor="option2" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
          Option 2
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Checkbox id="option3" />
        <label htmlFor="option3" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
          Option 3
        </label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Checkbox id="option4" disabled />
        <label htmlFor="option4" style={{ fontSize: '0.875rem', cursor: 'not-allowed', opacity: 0.5 }}>
          Option 4 (Disabled)
        </label>
      </div>
    </div>
  ),
};

/**
 * Checkbox list with descriptions.
 * Shows how to add additional context to options.
 */
export const WithDescriptions: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '400px' }}>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Checkbox id="notifications" defaultChecked />
        <div>
          <label htmlFor="notifications" style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'block' }}>
            Email Notifications
          </label>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Receive email updates about student progress and important announcements.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Checkbox id="sms" />
        <div>
          <label htmlFor="sms" style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'block' }}>
            SMS Notifications
          </label>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Get text messages for urgent alerts and attendance updates.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Checkbox id="push" defaultChecked />
        <div>
          <label htmlFor="push" style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'block' }}>
            Push Notifications
          </label>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Receive in-app notifications for real-time updates.
          </p>
        </div>
      </div>
    </div>
  ),
};

/**
 * Form with checkboxes.
 * Demonstrates checkboxes in a complete form context.
 */
export const FormExample: Story = {
  render: () => (
    <div style={{ width: '400px', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
        Notification Preferences
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Checkbox id="form-email" defaultChecked />
          <label htmlFor="form-email" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
            Email notifications
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Checkbox id="form-sms" />
          <label htmlFor="form-sms" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
            SMS notifications
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Checkbox id="form-push" defaultChecked />
          <label htmlFor="form-push" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
            Push notifications
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Checkbox id="form-marketing" />
          <label htmlFor="form-marketing" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
            Marketing emails
          </label>
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Checkbox id="form-terms" />
          <label htmlFor="form-terms" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
            I agree to the terms and conditions
          </label>
        </div>
      </div>
    </div>
  ),
};

/**
 * All states displayed together.
 */
export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Checkbox id="unchecked" />
        <label htmlFor="unchecked" style={{ fontSize: '0.875rem' }}>Unchecked</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Checkbox id="checked" checked readOnly />
        <label htmlFor="checked" style={{ fontSize: '0.875rem' }}>Checked</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Checkbox id="disabled-unchecked" disabled />
        <label htmlFor="disabled-unchecked" style={{ fontSize: '0.875rem', opacity: 0.5 }}>Disabled Unchecked</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Checkbox id="disabled-checked" disabled checked readOnly />
        <label htmlFor="disabled-checked" style={{ fontSize: '0.875rem', opacity: 0.5 }}>Disabled Checked</label>
      </div>
    </div>
  ),
};
