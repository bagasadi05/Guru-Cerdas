import { useState, useDeferredValue } from 'react';
import { AttendanceRecord } from '../../../types';
import { type AttendanceViewMode } from '../attendanceMenuConfig';

export const useAttendanceState = (initialDate: string) => {
    const [selectedSemesterId, setSelectedSemesterId] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>(initialDate);
    const [calendarMonth, setCalendarMonth] = useState<string>(initialDate.slice(0, 7));

    const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
    const [noteText, setNoteText] = useState('');
    
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);
    
    const [viewMode, setViewMode] = useState<AttendanceViewMode>('list');
    
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

    return {
        selectedSemesterId, setSelectedSemesterId,
        selectedClass, setSelectedClass,
        selectedDate, setSelectedDate,
        calendarMonth, setCalendarMonth,
        attendanceRecords, setAttendanceRecords,
        selectedStudents, setSelectedStudents,
        isDatePickerOpen, setDatePickerOpen,
        isNoteModalOpen, setIsNoteModalOpen,
        noteText, setNoteText,
        searchQuery, setSearchQuery, deferredSearchQuery,
        viewMode, setViewMode,
        isResetModalOpen, setIsResetModalOpen,
        isSaveConfirmOpen, setIsSaveConfirmOpen
    };
};
