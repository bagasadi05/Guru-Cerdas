import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  args: { isOpen: true, title: 'Konfirmasi', children: <p className="text-slate-600 dark:text-slate-300">Apakah Anda yakin?</p> },
  argTypes: { isOpen: { control: 'boolean' }, maxWidth: { control: 'text' } },
};
export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {};
export const WithIcon: Story = {
  args: {
    icon: <span className="text-emerald-500 text-xl">✓</span>,
    children: <p className="text-slate-600 dark:text-slate-300">Data berhasil disimpan.</p>,
  },
};
export const Wide: Story = { args: { maxWidth: 'max-w-3xl' } };
