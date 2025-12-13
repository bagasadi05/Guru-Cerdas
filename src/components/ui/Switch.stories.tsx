import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from './Switch';

/**
 * The Switch component is a toggle control for binary on/off states.
 * It provides visual feedback with smooth animations.
 * 
 * ## Accessibility Features
 * - Native checkbox input with custom styling
 * - Keyboard navigation (Space to toggle)
 * - Focus ring for keyboard navigation
 * - Screen reader accessible (uses sr-only class for checkbox)
 * - Proper checked/unchecked states
 */
const meta = {
  title: 'UI/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An accessible toggle switch component with smooth animations and dark mode support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    checked: {
      control: 'boolean',
      description: 'Whether the switch is checked',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the switch is disabled',
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default switch (unchecked).
 */
export const Default: Story = {
  args: {},
};

/**
 * Checked switch.
 */
export const Checked: Story = {
  args: {
    checked: true,
  },
};

/**
 * Disabled switch.
 */
export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

/**
 * Disabled and checked switch.
 */
export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true,
  },
};

/**
 * Switch with label.
 * Shows proper form field structure.
 * 
 * **Accessibility**: Label is clickable and properly associated with switch.
 */
export const WithLabel: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <Switch id="notifications" />
      <label htmlFor="notifications" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
        Enable notifications
      </label>
    </div>
  ),
};

/**
 * Switch with label and description.
 * Common pattern for settings toggles.
 */
export const WithDescription: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', width: '400px' }}>
      <Switch id="email-notif" defaultChecked />
      <div style={{ flex: 1 }}>
        <label htmlFor="email-notif" style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'block' }}>
          Email Notifications
        </label>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
          Receive email updates about student progress and important announcements.
        </p>
      </div>
    </div>
  ),
};

/**
 * Multiple switches in a settings panel.
 * Common pattern for preference toggles.
 */
export const SettingsPanel: Story = {
  render: () => (
    <div style={{ width: '450px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <Switch id="setting1" defaultChecked />
        <div style={{ flex: 1 }}>
          <label htmlFor="setting1" style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'block' }}>
            Email Notifications
          </label>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Get notified about important updates via email.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <Switch id="setting2" />
        <div style={{ flex: 1 }}>
          <label htmlFor="setting2" style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'block' }}>
            SMS Notifications
          </label>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Receive text messages for urgent alerts.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <Switch id="setting3" defaultChecked />
        <div style={{ flex: 1 }}>
          <label htmlFor="setting3" style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer', display: 'block' }}>
            Push Notifications
          </label>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
            Receive in-app notifications for real-time updates.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <Switch id="setting4" disabled />
        <div style={{ flex: 1 }}>
          <label htmlFor="setting4" style={{ fontSize: '0.875rem', fontWeight: '500', cursor: 'not-allowed', display: 'block', opacity: 0.5 }}>
            Marketing Emails
          </label>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem', opacity: 0.5 }}>
            This feature is currently unavailable.
          </p>
        </div>
      </div>
    </div>
  ),
};

/**
 * Controlled switch.
 * Demonstrates external control of switch state.
 */
export const Controlled: Story = {
  render: () => {
    const [isEnabled, setIsEnabled] = React.useState(false);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Switch
            id="controlled-switch"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
          />
          <label htmlFor="controlled-switch" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
            Feature is {isEnabled ? 'enabled' : 'disabled'}
          </label>
        </div>
        <button
          onClick={() => setIsEnabled(!isEnabled)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Toggle from button
        </button>
      </div>
    );
  },
};

/**
 * Switch in a card layout.
 * Shows how switches work in a more complex UI.
 */
export const InCard: Story = {
  render: () => (
    <div style={{
      width: '400px',
      padding: '1.5rem',
      border: '1px solid #e5e7eb',
      borderRadius: '0.75rem',
      backgroundColor: 'white',
    }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Privacy Settings
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
        Manage your privacy and data sharing preferences.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>Profile Visibility</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
              Make your profile visible to others
            </div>
          </div>
          <Switch id="profile-vis" defaultChecked />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>Activity Status</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
              Show when you're active
            </div>
          </div>
          <Switch id="activity" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: '500' }}>Data Sharing</div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
              Share analytics data
            </div>
          </div>
          <Switch id="data-sharing" defaultChecked />
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Switch id="unchecked" />
        <label htmlFor="unchecked" style={{ fontSize: '0.875rem' }}>Unchecked</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Switch id="checked" checked readOnly />
        <label htmlFor="checked" style={{ fontSize: '0.875rem' }}>Checked</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Switch id="disabled-unchecked" disabled />
        <label htmlFor="disabled-unchecked" style={{ fontSize: '0.875rem', opacity: 0.5 }}>Disabled Unchecked</label>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Switch id="disabled-checked" disabled checked readOnly />
        <label htmlFor="disabled-checked" style={{ fontSize: '0.875rem', opacity: 0.5 }}>Disabled Checked</label>
      </div>
    </div>
  ),
};
