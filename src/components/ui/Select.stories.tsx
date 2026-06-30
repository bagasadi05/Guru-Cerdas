import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  args: {
    children: <>
      <option value="">Pilih Kelas</option>
      <option value="7A">7A</option>
      <option value="7B">7B</option>
      <option value="8A">8A</option>
    </>,
  },
  argTypes: { error: { control: 'text' }, disabled: { control: 'boolean' } },
};
export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};
export const Error: Story = { args: { error: 'Pilih kelas terlebih dahulu' } };
export const Disabled: Story = { args: { disabled: true } };
