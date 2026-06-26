import type { Meta, StoryObj } from '@storybook/react';
import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertCircle, CheckCircle, Trash2, X } from 'lucide-react';

/**
 * UndoToastVisual is a self-contained demo of the UndoToast visual design.
 * The real UndoToast integrates with UndoManager service; this demo
 * uses local state for visual preview in Storybook.
 */
type UndoToastType = 'delete' | 'update' | 'info';

interface UndoToastVisualProps {
  message?: string;
  duration?: number;
  type?: UndoToastType;
}

const UndoToastVisual: React.FC<UndoToastVisualProps> = ({
  message = 'Siswa Ahmad dihapus dari kelas',
  duration = 10000,
  type = 'delete',
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const i = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 100));
    }, 100);
    return () => clearInterval(i);
  }, []);

  const progress = (timeRemaining / duration) * 100;
  const secondsRemaining = Math.ceil(timeRemaining / 1000);

  const getIcon = () => {
    switch (type) {
      case 'delete':
        return <Trash2 className="w-5 h-5" />;
      case 'update':
        return <CheckCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'delete':
        return { progress: 'bg-red-500', icon: 'text-red-400 bg-red-500/10' };
      case 'update':
        return { progress: 'bg-blue-500', icon: 'text-blue-400 bg-blue-500/10' };
      default:
        return { progress: 'bg-slate-500', icon: 'text-slate-400 bg-slate-500/10' };
    }
  };

  const colors = getColors();

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`
                fixed bottom-24 lg:bottom-6 left-1/2 -translate-x-1/2 z-50
                w-[90%] max-w-md
                bg-slate-900 border border-slate-700
                rounded-2xl shadow-2xl overflow-hidden
                transition-all duration-300 ease-out
                ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
    >
      <div className="h-1 bg-slate-800 overflow-hidden">
        <div
          className={`h-full ${colors.progress} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors.icon}`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">{message}</p>
            <p className="text-slate-400 text-sm">
              {secondsRemaining > 0
                ? `${secondsRemaining} detik tersisa untuk membatalkan`
                : 'Tidak dapat dibatalkan'}
            </p>
          </div>
          <button
            aria-label="Batalkan"
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Undo
          </button>
          <button
            aria-label="Tutup"
            className="p-2 text-slate-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

const meta = {
  title: 'UI/Toast',
  component: UndoToastVisual,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Toast notification with Undo action and countdown. Demo uses local state. Real UndoToast integrates with UndoManager service. Adapts to light/dark via design tokens; the toast itself is dark-themed for contrast on both modes.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    type: { control: 'select', options: ['delete', 'update', 'info'] },
    message: { control: 'text' },
  },
  args: {
    type: 'delete',
    message: 'Siswa Ahmad dihapus dari kelas',
  },
} satisfies Meta<typeof UndoToastVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Delete: Story = {
  args: {
    type: 'delete',
    message: 'Siswa Ahmad dihapus dari kelas',
  },
};

export const Update: Story = {
  args: {
    type: 'update',
    message: 'Nilai Bahasa Indonesia berhasil diperbarui',
  },
};

export const Info: Story = {
  args: {
    type: 'info',
    message: 'Sinkronisasi data ke cloud dimulai',
  },
};

export const LightBackground: Story = {
  name: 'On Light Background',
  parameters: {
    backgrounds: { default: 'light' },
  },
  render: (args) => (
    <div className="min-h-screen bg-white">
      <UndoToastVisual {...args} />
    </div>
  ),
};

export const DarkBackground: Story = {
  name: 'On Dark Background',
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: (args) => (
    <div className="min-h-screen bg-slate-950">
      <UndoToastVisual {...args} />
    </div>
  ),
};
