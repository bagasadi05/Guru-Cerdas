import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TaskCard } from '../../src/components/pages/tasks/components/TaskCard';
import { TaskColumn } from '../../src/components/pages/tasks/components/TaskColumn';
import { TasksStatsCards } from '../../src/components/pages/tasks/components/TasksStatsCards';
import { TasksHeader } from '../../src/components/pages/tasks/components/TasksHeader';
import { TaskRow } from '../../src/components/pages/tasks/types';

describe('Tasks Component Decomposition', () => {
    const mockTask: TaskRow = {
        id: 't-1',
        user_id: 'u-1',
        title: 'Koreksi Ulangan Harian',
        description: 'Bab 1 dan 2 https://example.com',
        due_date: '2026-12-31',
        status: 'todo',
        class_id: null,
        completed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
    };

    it('renders TaskCard with title, link, and triggers actions', () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        const onStatusChange = vi.fn();

        render(
            <TaskCard
                task={mockTask}
                onEdit={onEdit}
                onDelete={onDelete}
                onStatusChange={onStatusChange}
            />
        );

        expect(screen.getByText('Koreksi Ulangan Harian')).toBeInTheDocument();
        expect(screen.getByRole('link')).toHaveAttribute('href', 'https://example.com');

        // Next status button for 'todo' is 'Sedang Dikerjakan'
        const nextBtn = screen.getByRole('button', { name: /sedang dikerjakan/i });
        fireEvent.click(nextBtn);
        expect(onStatusChange).toHaveBeenCalledWith('t-1', 'in_progress');
    });

    it('renders TaskColumn with task count and empty state if empty', () => {
        const onAddTask = vi.fn();

        render(
            <TaskColumn
                status="todo"
                tasks={[]}
                onEdit={() => {}}
                onDelete={() => {}}
                onStatusChange={() => {}}
                onAddTask={onAddTask}
                updatingTaskId={null}
            />
        );

        expect(screen.getByText('Belum Mulai')).toBeInTheDocument();
        expect(screen.getByText('0 tugas')).toBeInTheDocument();
        expect(screen.getByText('Tidak ada tugas')).toBeInTheDocument();
    });

    it('renders TasksStatsCards with correct numbers', () => {
        const stats = {
            total: 10,
            todo: 4,
            inProgress: 3,
            done: 3,
            overdue: 1,
        };

        render(<TasksStatsCards stats={stats} />);
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('4')).toBeInTheDocument();
        expect(screen.getAllByText('3')).toHaveLength(2);
    });

    it('renders TasksHeader and triggers search', () => {
        const onSearchChange = vi.fn();
        const onAddTaskClick = vi.fn();

        render(
            <TasksHeader
                searchQuery="pr"
                onSearchChange={onSearchChange}
                hasDoneTasks={true}
                onClearCompletedClick={() => {}}
                onAddTaskClick={onAddTaskClick}
            />
        );

        expect(screen.getByText('Manajemen Tugas')).toBeInTheDocument();
        const searchInput = screen.getByPlaceholderText(/cari tugas/i);
        fireEvent.change(searchInput, { target: { value: 'ujian' } });
        expect(onSearchChange).toHaveBeenCalledWith('ujian');

        fireEvent.click(screen.getByRole('button', { name: /tugas baru/i }));
        expect(onAddTaskClick).toHaveBeenCalled();
    });
});
