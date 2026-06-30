import type { Meta, StoryObj } from '@storybook/react';
import { EmptyState } from './EmptyState';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  argTypes: { variant: { control: 'select', options: ['card','inline'] } },
};
export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: { title: 'Belum ada data siswa', description: 'Tambahkan siswa baru untuk memulai.', actionLabel: 'Tambah Siswa', onAction: () => {} },
};
export const WithIcon: Story = {
  args: { title: 'Tidak ada kelas', description: 'Buat kelas terlebih dahulu.' },
};
export const CardVariant: Story = {
  args: { variant: 'card', title: 'Kosong', description: 'Belum ada data untuk ditampilkan.' },
};
