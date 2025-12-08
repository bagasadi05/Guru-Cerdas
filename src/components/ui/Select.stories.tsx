import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

/**
 * The Select component is a dropdown selection input with validation support.
 * It provides visual feedback for errors and maintains accessibility standards.
 * 
 * ## Accessibility Features
 * - Native select element for maximum compatibility
 * - Keyboard navigation support
 * - Focus-visible for keyboard navigation
 * - Error messages for validation feedback
 * - Disabled state properly communicated
 */
const meta = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An accessible select dropdown component with error state support, focus management, and dark mode compatibility.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
      description: 'Whether the select is disabled',
    },
    error: {
      control: 'text',
      description: 'Error message to display',
    },
    children: {
      control: false,
      description: 'Option elements',
    },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default select dropdown.
 */
export const Default: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <Select>
        <option value="">Select an option</option>
        <option value="1">Option 1</option>
        <option value="2">Option 2</option>
        <option value="3">Option 3</option>
      </Select>
    </div>
  ),
};

/**
 * Select with a label.
 * Shows proper form field structure.
 */
export const WithLabel: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <label htmlFor="grade-select" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Grade Level
      </label>
      <Select id="grade-select">
        <option value="">Select grade</option>
        <option value="1">Grade 1</option>
        <option value="2">Grade 2</option>
        <option value="3">Grade 3</option>
        <option value="4">Grade 4</option>
        <option value="5">Grade 5</option>
      </Select>
    </div>
  ),
};

/**
 * Select with error state.
 * Shows validation feedback.
 */
export const WithError: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <label htmlFor="subject-select" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Subject
      </label>
      <Select id="subject-select" error="Please select a subject">
        <option value="">Select subject</option>
        <option value="math">Mathematics</option>
        <option value="science">Science</option>
        <option value="english">English</option>
      </Select>
    </div>
  ),
};

/**
 * Disabled select state.
 * Shows reduced opacity and prevents interaction.
 */
export const Disabled: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <label htmlFor="disabled-select" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Status
      </label>
      <Select id="disabled-select" disabled>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </Select>
    </div>
  ),
};

/**
 * Select with grouped options.
 * Uses optgroup for organizing related options.
 */
export const WithGroups: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <label htmlFor="course-select" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Course
      </label>
      <Select id="course-select">
        <option value="">Select a course</option>
        <optgroup label="Mathematics">
          <option value="algebra">Algebra</option>
          <option value="geometry">Geometry</option>
          <option value="calculus">Calculus</option>
        </optgroup>
        <optgroup label="Science">
          <option value="biology">Biology</option>
          <option value="chemistry">Chemistry</option>
          <option value="physics">Physics</option>
        </optgroup>
        <optgroup label="Languages">
          <option value="english">English</option>
          <option value="spanish">Spanish</option>
          <option value="french">French</option>
        </optgroup>
      </Select>
    </div>
  ),
};

/**
 * Select with pre-selected value.
 * Shows how to set a default value.
 */
export const WithDefaultValue: Story = {
  render: () => (
    <div style={{ width: '300px' }}>
      <label htmlFor="status-select" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
        Student Status
      </label>
      <Select id="status-select" defaultValue="active">
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="graduated">Graduated</option>
        <option value="transferred">Transferred</option>
      </Select>
    </div>
  ),
};

/**
 * Complete form with multiple selects.
 * Demonstrates various select configurations.
 */
export const FormExample: Story = {
  render: () => (
    <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <label htmlFor="form-grade" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Grade Level
        </label>
        <Select id="form-grade">
          <option value="">Select grade</option>
          <option value="1">Grade 1</option>
          <option value="2">Grade 2</option>
          <option value="3">Grade 3</option>
        </Select>
      </div>
      <div>
        <label htmlFor="form-subject" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Subject
        </label>
        <Select id="form-subject" error="This field is required">
          <option value="">Select subject</option>
          <option value="math">Mathematics</option>
          <option value="science">Science</option>
          <option value="english">English</option>
        </Select>
      </div>
      <div>
        <label htmlFor="form-status" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Status
        </label>
        <Select id="form-status" defaultValue="active">
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
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
        <Select>
          <option value="">Select option</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Error State
        </label>
        <Select error="This field is required">
          <option value="">Select option</option>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      </div>
      <div>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
          Disabled State
        </label>
        <Select disabled>
          <option value="1">Option 1</option>
          <option value="2">Option 2</option>
        </Select>
      </div>
    </div>
  ),
};
