import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

/**
 * The Textarea component is a multi-line text input field.
 * It provides a larger input area for longer text content.
 * 
 * ## Accessibility Features
 * - Native textarea element for maximum compatibility
 * - Keyboard navigation
 * - Focus ring for keyboard navigation
 * - Disabled state properly communicated
 * - Resize disabled for consistent layout
 */
const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An accessible textarea component with focus management and dark mode support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the textarea is disabled',
    },
    rows: {
      control: 'number',
      description: 'Number of visible text rows',
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default textarea.
 */
export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
    rows: 4,
  },
  render: (args) => (
    <div style={{ width: '400px' }}>
      <Textarea {...args} />
    </div>
  ),
};

/**
 * Textarea with label.
 * Shows proper form field structure.
 */
export const WithLabel: Story = {
  render: () => (
    <div style={{ width: '400px' }}>
      <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Description
      </label>
      <Textarea id="description" placeholder="Enter a detailed description..." rows={4} />
    </div>
  ),
};

/**
 * Textarea with character count.
 * Shows how to add a character counter.
 */
export const WithCharacterCount: Story = {
  render: () => {
    const [text, setText] = React.useState('');
    const maxLength = 200;

    return (
      <div style={{ width: '400px' }}>
        <label htmlFor="bio" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Bio
        </label>
        <Textarea
          id="bio"
          placeholder="Tell us about yourself..."
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={maxLength}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
          {text.length} / {maxLength}
        </div>
      </div>
    );
  },
};

/**
 * Disabled textarea.
 */
export const Disabled: Story = {
  args: {
    placeholder: 'This textarea is disabled',
    disabled: true,
    value: 'Cannot edit this content',
    rows: 4,
  },
  render: (args) => (
    <div style={{ width: '400px' }}>
      <Textarea {...args} />
    </div>
  ),
};

/**
 * Small textarea (fewer rows).
 */
export const Small: Story = {
  args: {
    placeholder: 'Short comment...',
    rows: 2,
  },
  render: (args) => (
    <div style={{ width: '400px' }}>
      <label htmlFor="comment" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Quick Comment
      </label>
      <Textarea id="comment" {...args} />
    </div>
  ),
};

/**
 * Large textarea (more rows).
 */
export const Large: Story = {
  args: {
    placeholder: 'Write a detailed report...',
    rows: 8,
  },
  render: (args) => (
    <div style={{ width: '500px' }}>
      <label htmlFor="report" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Report
      </label>
      <Textarea id="report" {...args} />
    </div>
  ),
};

/**
 * Textarea with helper text.
 * Shows how to add guidance below the field.
 */
export const WithHelperText: Story = {
  render: () => (
    <div style={{ width: '400px' }}>
      <label htmlFor="feedback" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Feedback
      </label>
      <Textarea id="feedback" placeholder="Share your thoughts..." rows={4} />
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem' }}>
        Your feedback helps us improve the application.
      </p>
    </div>
  ),
};

/**
 * Textarea with error state.
 * Shows validation feedback.
 */
export const WithError: Story = {
  render: () => (
    <div style={{ width: '400px' }}>
      <label htmlFor="message" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Message
      </label>
      <Textarea
        id="message"
        placeholder="Enter your message..."
        rows={4}
        style={{ borderColor: '#ef4444' }}
      />
      <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.5rem' }}>
        Message must be at least 10 characters long
      </p>
    </div>
  ),
};

/**
 * Form with textarea.
 * Demonstrates textarea in a complete form context.
 */
export const FormExample: Story = {
  render: () => (
    <div style={{ width: '500px', padding: '1.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1.5rem' }}>
        Contact Form
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <label htmlFor="form-name" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
            Name
          </label>
          <input
            id="form-name"
            type="text"
            placeholder="Your name"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
            }}
          />
        </div>
        <div>
          <label htmlFor="form-email" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
            Email
          </label>
          <input
            id="form-email"
            type="email"
            placeholder="your@email.com"
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
            }}
          />
        </div>
        <div>
          <label htmlFor="form-message" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
            Message
          </label>
          <Textarea id="form-message" placeholder="Your message..." rows={5} />
        </div>
        <button
          style={{
            padding: '0.625rem 1.5rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '0.5rem',
            border: 'none',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Send Message
        </button>
      </div>
    </div>
  ),
};

/**
 * All states displayed together.
 */
export const AllStates: Story = {
  render: () => (
    <div style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Normal State
        </label>
        <Textarea placeholder="Normal textarea" rows={3} />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          With Content
        </label>
        <Textarea value="This textarea has some content in it." rows={3} readOnly />
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Disabled State
        </label>
        <Textarea placeholder="Disabled textarea" disabled rows={3} />
      </div>
    </div>
  ),
};
