import type { Meta, StoryObj } from '@storybook/react';
import { ErrorState } from './ErrorState';

const meta: Meta<typeof ErrorState> = {
  title: 'UI/ErrorState',
  component: ErrorState,
  args: { message: 'Gagal memuat data. Periksa koneksi Anda.' },
  argTypes: { fullWidth: { control: 'boolean' } },
};

export default meta;
type Story = StoryObj<typeof ErrorState>;

export const Default: Story = {};
export const WithRetry: Story = {
  args: { onRetry: () => {}, title: 'Koneksi Terputus' },
};
export const FullWidth: Story = { args: { fullWidth: true } };
