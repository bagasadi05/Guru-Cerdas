import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  args: { placeholder: 'Masukkan teks...' },
  argTypes: { error: { control: 'text' }, disabled: { control: 'boolean' } },
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};
export const WithValue: Story = { args: { value: 'John Doe', onChange: () => {} } };
export const Error: Story = { args: { error: 'Field ini wajib diisi', value: '' } };
export const Disabled: Story = { args: { disabled: true, value: 'Tidak bisa diedit' } };
