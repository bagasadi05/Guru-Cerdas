import type { Meta, StoryObj } from '@storybook/react';
import { Inbox } from 'lucide-react';
import { EmptyState } from './EmptyState';

const fn = () => () => { };

const meta = {
  title: 'UI/EmptyState',
  component: EmptyState,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Empty state placeholder for lists, tables, and search results. Supports two variants: card (boxed) and inline (plain). Includes icon, title, description, and optional CTA button. Auto-adapts to light and dark mode via design tokens.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['card', 'inline'],
      description: 'Layout variant',
      table: { defaultValue: { summary: 'inline' } },
    },
    title: { control: 'text' },
    description: { control: 'text' },
  },
  args: {
    title: 'Belum ada data',
    description: 'Tambahkan data untuk mulai mengelola siswa dan nilai.',
    onAction: fn(),
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Belum ada data',
    description: 'Tambahkan data untuk mulai mengelola siswa dan nilai.',
  },
};

export const WithIcon: Story = {
  args: {
    icon: <Inbox />,
    title: 'Tidak ada hasil',
    description: 'Coba ubah kata kunci pencarian atau tambah filter.',
  },
};

export const WithCTA: Story = {
  args: {
    icon: <Inbox />,
    title: 'Daftar siswa kosong',
    description: 'Tambahkan siswa baru untuk memulai.',
    actionLabel: 'Tambah Siswa',
  },
};

export const CardVariant: Story = {
  args: {
    variant: 'card',
    icon: <Inbox />,
    title: 'Belum ada pengumuman',
    description: 'Buat pengumuman untuk dibagikan ke siswa dan orang tua.',
    actionLabel: 'Buat Pengumuman',
  },
};

export const LightDarkComparison: Story = {
  name: 'Light & Dark',
  parameters: {
    docs: {
      description: {
        story: 'Toggle the background using the Storybook toolbar to compare light and dark variants. Component uses design system tokens that auto-adapt.',
      },
    },
  },
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
        <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Light</p>
        <EmptyState
          icon={<Inbox />}
          title="Belum ada data"
          description="Tambahkan data untuk mulai mengelola."
          actionLabel="Tambah"
        />
      </div>
      <div className="dark p-6 bg-slate-900 rounded-2xl">
        <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Dark</p>
        <EmptyState
          icon={<Inbox />}
          title="Belum ada data"
          description="Tambahkan data untuk mulai mengelola."
          actionLabel="Tambah"
        />
      </div>
    </div>
  ),
};
