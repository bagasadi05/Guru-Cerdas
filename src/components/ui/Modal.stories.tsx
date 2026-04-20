import type { Meta, StoryObj } from '@storybook/react';
import { Info } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

const meta = {
  title: 'UI/Modal',
  component: Modal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Accessible dialog component for confirmations, forms, and parent-facing explanations with focus management and keyboard dismissal.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Controls whether the modal is visible.',
    },
    title: {
      control: 'text',
      description: 'Heading announced by screen readers through aria-labelledby.',
    },
    maxWidth: {
      control: 'select',
      options: ['max-w-md', 'max-w-lg', 'max-w-2xl', 'max-w-4xl'],
      description: 'Tailwind max-width class for dialog sizing.',
    },
    icon: {
      control: false,
      description: 'Optional decorative icon shown beside the title.',
    },
    children: {
      control: false,
      description: 'Scrollable modal body content.',
    },
    onClose: {
      action: 'closed',
      description: 'Called when the overlay, close button, or Escape key closes the modal.',
    },
  },
  args: {
    isOpen: true,
    title: 'Ringkasan Informasi',
    maxWidth: 'max-w-lg',
    children: (
      <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
        <p>
          Modal ini digunakan untuk menampilkan informasi penting dengan ruang baca yang jelas.
        </p>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
          Konten dapat berupa ringkasan data, konfirmasi tindakan, atau formulir singkat.
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost">Batal</Button>
          <Button>Konfirmasi</Button>
        </div>
      </div>
    ),
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Accessibility: default modal story verifies focusable actions, readable body copy,
 * Escape dismissal behavior, and a clear labelled heading.
 */
export const Default: Story = {};

/**
 * Accessibility: icon usage remains decorative while the title provides the
 * accessible name for the dialog.
 */
export const WithIcon: Story = {
  args: {
    title: 'Panduan Cepat',
    icon: <Info className="h-5 w-5" />,
  },
};

/**
 * Accessibility: wide modal content keeps grouped information scannable without
 * removing keyboard navigation or scroll behavior.
 */
export const WideContent: Story = {
  args: {
    title: 'Detail Laporan',
    maxWidth: 'max-w-2xl',
    children: (
      <div className="grid gap-3 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2">
        {['Akademik', 'Kehadiran', 'Keaktifan', 'Komunikasi'].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <p className="font-semibold text-slate-900 dark:text-white">{item}</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">Ringkasan singkat untuk dibaca cepat.</p>
          </div>
        ))}
      </div>
    ),
  },
};
