import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';

/**
 * The Card component provides a flexible container for grouping related content.
 * It includes sub-components for header, title, description, content, and footer.
 * 
 * ## Accessibility Features
 * - Semantic HTML structure
 * - Proper heading hierarchy with CardTitle
 * - Clear visual separation between sections
 * - Backdrop blur and glassmorphism for modern UI
 */
const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A versatile card container with glassmorphism effects, supporting headers, content, and footers for organizing related information.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic card with just content.
 */
export const Basic: Story = {
  render: () => (
    <Card style={{ width: '350px' }}>
      <CardContent>
        <p>This is a basic card with simple content.</p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card with header, title, and content.
 */
export const WithHeader: Story = {
  render: () => (
    <Card style={{ width: '350px' }}>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This card includes a header with a title and content section.</p>
      </CardContent>
    </Card>
  ),
};

/**
 * Card with header, title, description, and content.
 */
export const WithDescription: Story = {
  render: () => (
    <Card style={{ width: '350px' }}>
      <CardHeader>
        <CardTitle>Student Profile</CardTitle>
        <CardDescription>View and manage student information</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Student details and academic information will be displayed here.</p>
      </CardContent>
    </Card>
  ),
};

/**
 * Complete card with all sections: header, content, and footer.
 * This is the most common pattern for action cards.
 */
export const Complete: Story = {
  render: () => (
    <Card style={{ width: '350px' }}>
      <CardHeader>
        <CardTitle>Confirm Action</CardTitle>
        <CardDescription>Are you sure you want to proceed?</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This action cannot be undone. Please review before confirming.</p>
      </CardContent>
      <CardFooter style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <Button variant="outline">Cancel</Button>
        <Button variant="default">Confirm</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Card with form elements.
 * Demonstrates how cards can contain interactive content.
 */
export const WithForm: Story = {
  render: () => (
    <Card style={{ width: '400px' }}>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your details to create a new account</CardDescription>
      </CardHeader>
      <CardContent>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
              }}
            />
          </div>
          <div>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="john@example.com"
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.375rem',
                border: '1px solid #d1d5db',
              }}
            />
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button style={{ width: '100%' }}>Create Account</Button>
      </CardFooter>
    </Card>
  ),
};

/**
 * Card with statistics or metrics.
 * Common pattern for dashboard widgets.
 */
export const Statistics: Story = {
  render: () => (
    <Card style={{ width: '300px' }}>
      <CardHeader>
        <CardTitle>Total Students</CardTitle>
        <CardDescription>Active students this semester</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>1,234</div>
        <p style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.5rem' }}>
          ↑ 12% from last month
        </p>
      </CardContent>
    </Card>
  ),
};

/**
 * Multiple cards in a grid layout.
 * Shows how cards work together in a dashboard.
 */
export const Grid: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', width: '700px' }}>
      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>95%</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Grades</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>A-</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>12/15</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Behavior</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>Excellent</div>
        </CardContent>
      </Card>
    </div>
  ),
};
