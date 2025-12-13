import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
import { Card, CardContent } from './Card';

/**
 * The Tabs component provides a way to organize content into separate views.
 * It supports both controlled and uncontrolled modes with keyboard navigation.
 * 
 * ## Accessibility Features
 * - Proper ARIA roles (tablist, tab, tabpanel)
 * - Keyboard navigation (arrow keys, tab)
 * - aria-selected for active tab state
 * - Focus management with visible focus rings
 * - data-state attributes for styling
 */
const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An accessible tabs component with keyboard navigation, controlled/uncontrolled modes, and smooth transitions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    defaultValue: {
      control: 'text',
      description: 'Default active tab (uncontrolled mode)',
    },
    value: {
      control: 'text',
      description: 'Active tab value (controlled mode)',
    },
    onValueChange: {
      action: 'value changed',
      description: 'Callback when tab changes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

/**
 * Basic tabs with simple content.
 */
export const Default: Story = {
  render: () => (
    <Tabs defaultValue="tab1" style={{ width: '500px' }}>
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        <TabsTrigger value="tab3">Tab 3</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1" style={{ marginTop: '1rem' }}>
        <p>Content for Tab 1</p>
      </TabsContent>
      <TabsContent value="tab2" style={{ marginTop: '1rem' }}>
        <p>Content for Tab 2</p>
      </TabsContent>
      <TabsContent value="tab3" style={{ marginTop: '1rem' }}>
        <p>Content for Tab 3</p>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * Tabs with card content.
 * Common pattern for organizing related information.
 */
export const WithCards: Story = {
  render: () => (
    <Tabs defaultValue="overview" style={{ width: '600px' }}>
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" style={{ marginTop: '1rem' }}>
        <Card>
          <CardContent>
            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Overview</h3>
            <p>This is the overview section with general information about the student.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="details" style={{ marginTop: '1rem' }}>
        <Card>
          <CardContent>
            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Details</h3>
            <p>Detailed information including grades, attendance, and behavior records.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="settings" style={{ marginTop: '1rem' }}>
        <Card>
          <CardContent>
            <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Settings</h3>
            <p>Configure notification preferences and privacy settings.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * Tabs with icons.
 * Visual indicators help users identify tab content.
 */
export const WithIcons: Story = {
  render: () => (
    <Tabs defaultValue="profile" style={{ width: '600px' }}>
      <TabsList>
        <TabsTrigger value="profile">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Profile
          </span>
        </TabsTrigger>
        <TabsTrigger value="grades">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            Grades
          </span>
        </TabsTrigger>
        <TabsTrigger value="attendance">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Attendance
          </span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile" style={{ marginTop: '1rem' }}>
        <Card>
          <CardContent>
            <p>Student profile information and personal details.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="grades" style={{ marginTop: '1rem' }}>
        <Card>
          <CardContent>
            <p>Academic performance and grade history.</p>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="attendance" style={{ marginTop: '1rem' }}>
        <Card>
          <CardContent>
            <p>Attendance records and statistics.</p>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * Tabs with rich content.
 * Shows how tabs can contain complex layouts.
 */
export const RichContent: Story = {
  render: () => (
    <Tabs defaultValue="dashboard" style={{ width: '700px' }}>
      <TabsList>
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="dashboard" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <Card>
            <CardContent>
              <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Total Students</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>1,234</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Average Grade</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>B+</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Attendance Rate</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>94%</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h4 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Active Classes</h4>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>12</div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="analytics" style={{ marginTop: '1rem' }}>
        <Card>
          <CardContent>
            <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Performance Analytics</h3>
            <div style={{ height: '200px', background: 'linear-gradient(to right, #e0e7ff, #c7d2fe)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#4338ca', fontWeight: '500' }}>Chart Placeholder</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="reports" style={{ marginTop: '1rem' }}>
        <Card>
          <CardContent>
            <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Recent Reports</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Monthly Progress Report - November 2024</li>
              <li style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Attendance Summary - Q4 2024</li>
              <li style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>Grade Distribution Analysis</li>
              <li style={{ padding: '0.75rem' }}>Behavior Incident Report</li>
            </ul>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * Many tabs with scrolling.
 * Shows how tabs handle overflow.
 */
export const ManyTabs: Story = {
  render: () => (
    <Tabs defaultValue="tab1" style={{ width: '600px' }}>
      <div style={{ overflowX: 'auto' }}>
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
          <TabsTrigger value="tab3">Tab 3</TabsTrigger>
          <TabsTrigger value="tab4">Tab 4</TabsTrigger>
          <TabsTrigger value="tab5">Tab 5</TabsTrigger>
          <TabsTrigger value="tab6">Tab 6</TabsTrigger>
          <TabsTrigger value="tab7">Tab 7</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="tab1" style={{ marginTop: '1rem' }}>
        <Card><CardContent><p>Content for Tab 1</p></CardContent></Card>
      </TabsContent>
      <TabsContent value="tab2" style={{ marginTop: '1rem' }}>
        <Card><CardContent><p>Content for Tab 2</p></CardContent></Card>
      </TabsContent>
      <TabsContent value="tab3" style={{ marginTop: '1rem' }}>
        <Card><CardContent><p>Content for Tab 3</p></CardContent></Card>
      </TabsContent>
      <TabsContent value="tab4" style={{ marginTop: '1rem' }}>
        <Card><CardContent><p>Content for Tab 4</p></CardContent></Card>
      </TabsContent>
      <TabsContent value="tab5" style={{ marginTop: '1rem' }}>
        <Card><CardContent><p>Content for Tab 5</p></CardContent></Card>
      </TabsContent>
      <TabsContent value="tab6" style={{ marginTop: '1rem' }}>
        <Card><CardContent><p>Content for Tab 6</p></CardContent></Card>
      </TabsContent>
      <TabsContent value="tab7" style={{ marginTop: '1rem' }}>
        <Card><CardContent><p>Content for Tab 7</p></CardContent></Card>
      </TabsContent>
    </Tabs>
  ),
};

/**
 * Controlled tabs.
 * Demonstrates external control of tab state.
 */
export const Controlled: Story = {
  render: () => {
    const [activeTab, setActiveTab] = React.useState('home');

    return (
      <div style={{ width: '600px' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('home')}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
          >
            Go to Home
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', border: '1px solid #d1d5db' }}
          >
            Go to Settings
          </button>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="home" style={{ marginTop: '1rem' }}>
            <Card><CardContent><p>Home content - Current tab: {activeTab}</p></CardContent></Card>
          </TabsContent>
          <TabsContent value="profile" style={{ marginTop: '1rem' }}>
            <Card><CardContent><p>Profile content - Current tab: {activeTab}</p></CardContent></Card>
          </TabsContent>
          <TabsContent value="settings" style={{ marginTop: '1rem' }}>
            <Card><CardContent><p>Settings content - Current tab: {activeTab}</p></CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  },
};
