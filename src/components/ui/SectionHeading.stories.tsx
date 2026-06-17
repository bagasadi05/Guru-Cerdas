import type { Meta, StoryObj } from '@storybook/react';
import { Users, BookOpen, BarChart3 } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

const meta = {
  title: 'UI/SectionHeading',
  component: SectionHeading,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Standardized section heading with an emerald accent bar. Renders a semantic h2 with optional fade-in animation. Adapts to light and dark mode automatically.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    animate: { control: 'boolean' },
  },
  args: {
    animate: false,
  },
} satisfies Meta<typeof SectionHeading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Daftar Siswa',
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Users className="w-5 h-5 text-emerald-500" />
        Daftar Siswa
      </>
    ),
  },
};

export const WithDifferentIcon: Story = {
  args: {
    children: (
      <>
        <BookOpen className="w-5 h-5 text-emerald-500" />
        Mata Pelajaran
      </>
    ),
  },
};

export const Animated: Story = {
  args: {
    animate: true,
    children: (
      <>
        <BarChart3 className="w-5 h-5 text-emerald-500" />
        Statistik Rapor
      </>
    ),
  },
};

export const LightDarkComparison: Story = {
  name: 'Light & Dark',
  args: {
    children: 'Daftar Siswa',
  },
  parameters: {
    docs: {
      description: {
        story: 'Section heading adapts to both modes via design tokens.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
        <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Light</p>
        <SectionHeading>
          <Users className="w-5 h-5 text-emerald-500" />
          Daftar Siswa
        </SectionHeading>
      </div>
      <div className="dark p-6 bg-slate-900 rounded-2xl">
        <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Dark</p>
        <SectionHeading>
          <Users className="w-5 h-5 text-emerald-500" />
          Daftar Siswa
        </SectionHeading>
      </div>
    </div>
  ),
};
