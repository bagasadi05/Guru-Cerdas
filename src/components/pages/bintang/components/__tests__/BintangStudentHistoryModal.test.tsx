import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BintangStudentHistoryModal } from '../BintangStudentHistoryModal';

vi.mock('../../../../../hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe('BintangStudentHistoryModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    studentId: 'student-1',
    student: {
      id: 'student-1',
      name: 'Muhammad Ali',
      parent_phone: '08123456789',
      parent_name: 'Bapak Ali',
    },
    violations: [],
    quizPoints: [],
    dailyObservations: [],
    isWalas: false,
    aspectMeta: {
      ADAB: { label: 'Adab' },
      KEDISIPLINAN: { label: 'Kedisiplinan' },
      KERAPIAN: { label: 'Kerapian' },
    },
    onOpenAddViolation: vi.fn(),
    onOpenEditViolation: vi.fn(),
    onDeleteViolation: vi.fn(),
    onOpenAddQuiz: vi.fn(),
    onOpenEditQuiz: vi.fn(),
    onDeleteQuiz: vi.fn(),
  };

  it('renders colSpan=3 for empty quizzes table when isWalas is false', () => {
    render(<BintangStudentHistoryModal {...defaultProps} isWalas={false} />);
    const emptyCell = screen.getByText('Belum ada poin keaktifan bulan ini');
    expect(emptyCell).toBeInTheDocument();
    expect(emptyCell).toHaveAttribute('colspan', '3');
  });

  it('renders colSpan=4 for empty quizzes table when isWalas is true', () => {
    render(<BintangStudentHistoryModal {...defaultProps} isWalas={true} />);
    const emptyCell = screen.getByText('Belum ada poin keaktifan bulan ini');
    expect(emptyCell).toBeInTheDocument();
    expect(emptyCell).toHaveAttribute('colspan', '4');
  });

  it('renders quiz items and points properly when quiz points exist', () => {
    const quizPoints = [
      {
        id: 'qp-1',
        student_id: 'student-1',
        quiz_name: 'Hafalan Surat Pendek',
        subject: 'Tahfidz',
        points: 5,
        quiz_date: '2026-09-18',
      },
    ];

    render(<BintangStudentHistoryModal {...defaultProps} quizPoints={quizPoints} />);
    expect(screen.getByText(/Hafalan Surat Pendek/)).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
    expect(screen.getByText('Tahfidz')).toBeInTheDocument();
  });
});
