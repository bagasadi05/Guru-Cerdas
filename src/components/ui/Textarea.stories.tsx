import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'UI/Textarea',
  component: Textarea,
  args: { placeholder: 'Tulis catatan...' },
  argTypes: { disabled: { control: 'boolean' } },
};
export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};
export const WithValue: Story = { args: { value: 'Catatan pembelajaran hari ini...' } };
export const Disabled: Story = { args: { disabled: true, value: 'Catatan terkunci' } };
