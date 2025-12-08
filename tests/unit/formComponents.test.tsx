import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import { Input } from '../../src/components/ui/Input';
import { Select } from '../../src/components/ui/Select';
import { Modal } from '../../src/components/ui/Modal';
import React, { useState } from 'react';

describe('Input Component', () => {
    it('renders without crashing', () => {
        expect(() => renderWithProviders(<Input />)).not.toThrow();
    });

    it('accepts placeholder prop', () => {
        renderWithProviders(<Input placeholder="Enter text..." />);
        expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument();
    });

    it('handles value changes', () => {
        const TestComponent = () => {
            const [value, setValue] = useState('');
            return <Input value={value} onChange={(e) => setValue(e.target.value)} data-testid="input" />;
        };

        renderWithProviders(<TestComponent />);
        const input = screen.getByTestId('input');

        fireEvent.change(input, { target: { value: 'test value' } });
        expect(input).toHaveValue('test value');
    });

    it('applies custom className', () => {
        renderWithProviders(<Input className="custom-class" data-testid="input" />);
        expect(screen.getByTestId('input')).toHaveClass('custom-class');
    });

    it('supports disabled state', () => {
        renderWithProviders(<Input disabled data-testid="input" />);
        expect(screen.getByTestId('input')).toBeDisabled();
    });

    it('supports required attribute', () => {
        renderWithProviders(<Input required data-testid="input" />);
        expect(screen.getByTestId('input')).toBeRequired();
    });

    it('supports different input types', () => {
        renderWithProviders(<Input type="email" data-testid="input" />);
        expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');
    });
});

describe('Select Component', () => {
    it('renders without crashing', () => {
        expect(() => renderWithProviders(
            <Select>
                <option value="1">Option 1</option>
            </Select>
        )).not.toThrow();
    });

    it('renders options correctly', () => {
        renderWithProviders(
            <Select data-testid="select">
                <option value="a">Option A</option>
                <option value="b">Option B</option>
            </Select>
        );

        expect(screen.getByText('Option A')).toBeInTheDocument();
        expect(screen.getByText('Option B')).toBeInTheDocument();
    });

    it('handles value changes', () => {
        const handleChange = vi.fn();
        renderWithProviders(
            <Select onChange={handleChange} data-testid="select">
                <option value="a">Option A</option>
                <option value="b">Option B</option>
            </Select>
        );

        fireEvent.change(screen.getByTestId('select'), { target: { value: 'b' } });
        expect(handleChange).toHaveBeenCalled();
    });

    it('supports disabled state', () => {
        renderWithProviders(
            <Select disabled data-testid="select">
                <option value="1">Option 1</option>
            </Select>
        );
        expect(screen.getByTestId('select')).toBeDisabled();
    });
});

describe('Modal Component', () => {
    it('renders when isOpen is true', () => {
        renderWithProviders(
            <Modal isOpen={true} onClose={() => { }} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        expect(screen.getByText('Test Modal')).toBeInTheDocument();
        expect(screen.getByText('Modal content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        renderWithProviders(
            <Modal isOpen={false} onClose={() => { }} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
    });

    it('calls onClose when close button is clicked', () => {
        const handleClose = vi.fn();
        renderWithProviders(
            <Modal isOpen={true} onClose={handleClose} title="Test Modal">
                <p>Modal content</p>
            </Modal>
        );

        // Find and click close button (usually an X icon)
        const closeButton = screen.getByRole('button');
        fireEvent.click(closeButton);

        expect(handleClose).toHaveBeenCalled();
    });

    it('renders with icon prop', () => {
        renderWithProviders(
            <Modal
                isOpen={true}
                onClose={() => { }}
                title="Test Modal"
                icon={<span data-testid="modal-icon">Icon</span>}
            >
                <p>Modal content</p>
            </Modal>
        );

        expect(screen.getByTestId('modal-icon')).toBeInTheDocument();
    });
});
