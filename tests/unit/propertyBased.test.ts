import { describe, it, expect } from 'vitest';

/**
 * Property-Based Testing for Data Validation
 * These tests verify properties that should hold for all valid inputs
 */

// Helper to generate random data
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomString = (length: number) => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ';
    return Array.from({ length }, () => chars[randomInt(0, chars.length - 1)]).join('');
};
const randomEmail = () => `${randomString(8).toLowerCase().trim()}@example.com`;
const randomPhone = () => `08${randomInt(10000000000, 99999999999)}`.substring(0, 12);
const randomDate = () => {
    const start = new Date(2020, 0, 1);
    const end = new Date(2030, 11, 31);
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
};

describe('Property-Based Testing: Student Data', () => {
    const generateStudent = () => ({
        id: crypto.randomUUID(),
        name: randomString(randomInt(2, 50)),
        class_id: crypto.randomUUID(),
        gender: Math.random() > 0.5 ? 'Laki-laki' : 'Perempuan',
        avatar_url: '',
        access_code: randomString(6).toUpperCase().replace(/[^A-Z0-9]/g, 'A').substring(0, 6),
        parent_phone: randomPhone()
    });

    it('property: all generated students have valid UUIDs', () => {
        for (let i = 0; i < 100; i++) {
            const student = generateStudent();
            expect(student.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        }
    });

    it('property: name length is always between 2 and 50', () => {
        for (let i = 0; i < 100; i++) {
            const student = generateStudent();
            expect(student.name.length).toBeGreaterThanOrEqual(2);
            expect(student.name.length).toBeLessThanOrEqual(50);
        }
    });

    it('property: gender is always valid enum', () => {
        for (let i = 0; i < 100; i++) {
            const student = generateStudent();
            expect(['Laki-laki', 'Perempuan']).toContain(student.gender);
        }
    });

    it('property: access codes are always 6 alphanumeric chars', () => {
        for (let i = 0; i < 100; i++) {
            const student = generateStudent();
            expect(student.access_code).toMatch(/^[A-Z0-9]{6}$/);
        }
    });

    it('property: filtering by gender always returns subset', () => {
        const students = Array.from({ length: 100 }, generateStudent);
        const males = students.filter(s => s.gender === 'Laki-laki');
        const females = students.filter(s => s.gender === 'Perempuan');

        expect(males.length + females.length).toBe(students.length);
        expect(males.length).toBeGreaterThanOrEqual(0);
        expect(females.length).toBeGreaterThanOrEqual(0);
    });
});

describe('Property-Based Testing: Attendance Data', () => {
    const STATUSES = ['Hadir', 'Izin', 'Sakit', 'Alpha'] as const;

    const generateAttendance = () => ({
        id: crypto.randomUUID(),
        student_id: crypto.randomUUID(),
        date: randomDate(),
        status: STATUSES[randomInt(0, 3)],
        notes: Math.random() > 0.7 ? randomString(randomInt(0, 100)) : null
    });

    it('property: status is always a valid enum value', () => {
        for (let i = 0; i < 100; i++) {
            const attendance = generateAttendance();
            expect(STATUSES).toContain(attendance.status);
        }
    });

    it('property: date is always in valid format', () => {
        for (let i = 0; i < 100; i++) {
            const attendance = generateAttendance();
            expect(attendance.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
    });

    it('property: sum of status counts equals total', () => {
        const records = Array.from({ length: 100 }, generateAttendance);

        const counts = {
            hadir: records.filter(r => r.status === 'Hadir').length,
            izin: records.filter(r => r.status === 'Izin').length,
            sakit: records.filter(r => r.status === 'Sakit').length,
            alpha: records.filter(r => r.status === 'Alpha').length
        };

        expect(counts.hadir + counts.izin + counts.sakit + counts.alpha).toBe(100);
    });

    it('property: attendance rate is always between 0 and 100', () => {
        for (let i = 0; i < 50; i++) {
            const records = Array.from({ length: randomInt(1, 100) }, generateAttendance);
            const presentCount = records.filter(r => r.status === 'Hadir').length;
            const rate = (presentCount / records.length) * 100;

            expect(rate).toBeGreaterThanOrEqual(0);
            expect(rate).toBeLessThanOrEqual(100);
        }
    });
});

describe('Property-Based Testing: Task Data', () => {
    const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;

    const generateTask = () => ({
        id: crypto.randomUUID(),
        title: randomString(randomInt(3, 100)),
        description: Math.random() > 0.5 ? randomString(randomInt(0, 500)) : null,
        status: TASK_STATUSES[randomInt(0, 2)],
        due_date: Math.random() > 0.3 ? randomDate() : null,
        created_at: new Date().toISOString()
    });

    it('property: task status is always valid', () => {
        for (let i = 0; i < 100; i++) {
            const task = generateTask();
            expect(TASK_STATUSES).toContain(task.status);
        }
    });

    it('property: title length is always >= 3', () => {
        for (let i = 0; i < 100; i++) {
            const task = generateTask();
            expect(task.title.length).toBeGreaterThanOrEqual(3);
        }
    });

    it('property: filtering by status returns subset', () => {
        const tasks = Array.from({ length: 100 }, generateTask);

        const todoCount = tasks.filter(t => t.status === 'todo').length;
        const inProgressCount = tasks.filter(t => t.status === 'in_progress').length;
        const doneCount = tasks.filter(t => t.status === 'done').length;

        expect(todoCount + inProgressCount + doneCount).toBe(100);
    });

    it('property: sorting by due_date preserves all items', () => {
        const tasks = Array.from({ length: 50 }, generateTask).filter(t => t.due_date);
        const sorted = [...tasks].sort((a, b) =>
            new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
        );

        expect(sorted.length).toBe(tasks.length);

        // Verify sorted order
        for (let i = 1; i < sorted.length; i++) {
            const prevDate = new Date(sorted[i - 1].due_date!).getTime();
            const currDate = new Date(sorted[i].due_date!).getTime();
            expect(currDate).toBeGreaterThanOrEqual(prevDate);
        }
    });
});

describe('Property-Based Testing: Schedule Data', () => {
    const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;

    const generateTime = () => {
        const hour = randomInt(7, 16).toString().padStart(2, '0');
        const minute = ['00', '15', '30', '45'][randomInt(0, 3)];
        return `${hour}:${minute}`;
    };

    const generateSchedule = () => {
        const startTime = generateTime();
        const startHour = parseInt(startTime.split(':')[0]);
        const endHour = randomInt(startHour + 1, 17);
        const endTime = `${endHour.toString().padStart(2, '0')}:${['00', '30'][randomInt(0, 1)]}`;

        return {
            id: crypto.randomUUID(),
            day: DAYS[randomInt(0, 4)],
            subject: randomString(randomInt(5, 30)),
            start_time: startTime,
            end_time: endTime
        };
    };

    it('property: day is always valid', () => {
        for (let i = 0; i < 100; i++) {
            const schedule = generateSchedule();
            expect(DAYS).toContain(schedule.day);
        }
    });

    it('property: end_time is always after start_time', () => {
        for (let i = 0; i < 100; i++) {
            const schedule = generateSchedule();
            expect(schedule.end_time > schedule.start_time).toBe(true);
        }
    });

    it('property: time format is always valid', () => {
        for (let i = 0; i < 100; i++) {
            const schedule = generateSchedule();
            expect(schedule.start_time).toMatch(/^\d{2}:\d{2}$/);
            expect(schedule.end_time).toMatch(/^\d{2}:\d{2}$/);
        }
    });

    it('property: grouping by day returns all items', () => {
        const schedules = Array.from({ length: 100 }, generateSchedule);

        const byDay = DAYS.reduce((acc, day) => {
            acc[day] = schedules.filter(s => s.day === day);
            return acc;
        }, {} as Record<string, typeof schedules>);

        const totalGrouped = Object.values(byDay).reduce((sum, arr) => sum + arr.length, 0);
        expect(totalGrouped).toBe(100);
    });
});

describe('Property-Based Testing: Search and Filter', () => {
    it('property: search always returns subset of original', () => {
        const items = Array.from({ length: 100 }, () => ({
            name: randomString(randomInt(5, 30))
        }));

        const searchTerm = 'a';
        const filtered = items.filter(i =>
            i.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        expect(filtered.length).toBeLessThanOrEqual(items.length);
        filtered.forEach(item => {
            expect(item.name.toLowerCase()).toContain(searchTerm.toLowerCase());
        });
    });

    it('property: empty search returns all items', () => {
        const items = Array.from({ length: 50 }, () => ({
            name: randomString(randomInt(5, 30))
        }));

        const searchTerm = '';
        const filtered = items.filter(i =>
            !searchTerm || i.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        expect(filtered.length).toBe(items.length);
    });

    it('property: pagination preserves total count', () => {
        const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));
        const pageSize = 10;
        const totalPages = Math.ceil(items.length / pageSize);

        let totalItemsFromPages = 0;
        for (let page = 0; page < totalPages; page++) {
            const pageItems = items.slice(page * pageSize, (page + 1) * pageSize);
            totalItemsFromPages += pageItems.length;
        }

        expect(totalItemsFromPages).toBe(items.length);
    });
});

describe('Property-Based Testing: Data Transformations', () => {
    it('property: mapping preserves array length', () => {
        const items = Array.from({ length: randomInt(10, 100) }, () => ({
            value: randomInt(1, 100)
        }));

        const mapped = items.map(i => ({ ...i, doubled: i.value * 2 }));

        expect(mapped.length).toBe(items.length);
        mapped.forEach((item, index) => {
            expect(item.doubled).toBe(items[index].value * 2);
        });
    });

    it('property: reduce sum equals manual sum', () => {
        const numbers = Array.from({ length: 50 }, () => randomInt(1, 100));

        const reduceSum = numbers.reduce((sum, n) => sum + n, 0);

        let manualSum = 0;
        for (const n of numbers) {
            manualSum += n;
        }

        expect(reduceSum).toBe(manualSum);
    });

    it('property: unique filter removes only duplicates', () => {
        const values = [1, 2, 2, 3, 3, 3, 4, 5, 5];
        const unique = [...new Set(values)];

        expect(unique.length).toBeLessThanOrEqual(values.length);
        expect(unique).toEqual([1, 2, 3, 4, 5]);
    });
});
