import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    loginSchema,
    signupSchema,
    createStudentSchema,
    createTaskSchema,
    createAttendanceSchema,
    createScheduleSchema,
    validateData,
    sanitizeHtml,
    sanitizeInput,
    emailSchema,
    phoneSchema,
    accessCodeSchema
} from '../../src/utils/validation';

describe('Validation Schemas', () => {
    describe('Email Schema', () => {
        it('accepts valid email', () => {
            const result = emailSchema.safeParse('test@example.com');
            expect(result.success).toBe(true);
        });

        it('rejects invalid email', () => {
            const result = emailSchema.safeParse('invalid-email');
            expect(result.success).toBe(false);
        });

        it('rejects empty email', () => {
            const result = emailSchema.safeParse('');
            expect(result.success).toBe(false);
        });
    });

    describe('Phone Schema', () => {
        it('accepts valid Indonesian phone number', () => {
            const result = phoneSchema.safeParse('081234567890');
            expect(result.success).toBe(true);
        });

        it('accepts phone with +62 prefix', () => {
            const result = phoneSchema.safeParse('+6281234567890');
            expect(result.success).toBe(true);
        });

        it('accepts null phone', () => {
            const result = phoneSchema.safeParse(null);
            expect(result.success).toBe(true);
        });

        it('rejects invalid phone format', () => {
            const result = phoneSchema.safeParse('12345');
            expect(result.success).toBe(false);
        });
    });

    describe('Access Code Schema', () => {
        it('accepts valid 6-char uppercase code', () => {
            const result = accessCodeSchema.safeParse('ABC123');
            expect(result.success).toBe(true);
        });

        it('rejects lowercase code', () => {
            const result = accessCodeSchema.safeParse('abc123');
            expect(result.success).toBe(false);
        });

        it('accepts null', () => {
            const result = accessCodeSchema.safeParse(null);
            expect(result.success).toBe(true);
        });
    });

    describe('Login Schema', () => {
        it('accepts valid login data', () => {
            const result = loginSchema.safeParse({
                email: 'test@example.com',
                password: '123456'
            });
            expect(result.success).toBe(true);
        });

        it('rejects short password', () => {
            const result = loginSchema.safeParse({
                email: 'test@example.com',
                password: '12345'
            });
            expect(result.success).toBe(false);
        });
    });

    describe('Signup Schema', () => {
        it('accepts valid signup data', () => {
            const result = signupSchema.safeParse({
                email: 'test@example.com',
                password: 'Password123',
                confirmPassword: 'Password123'
            });
            expect(result.success).toBe(true);
        });

        it('rejects weak password', () => {
            const result = signupSchema.safeParse({
                email: 'test@example.com',
                password: 'password',
                confirmPassword: 'password'
            });
            expect(result.success).toBe(false);
        });

        it('rejects mismatched passwords', () => {
            const result = signupSchema.safeParse({
                email: 'test@example.com',
                password: 'Password123',
                confirmPassword: 'DifferentPassword123'
            });
            expect(result.success).toBe(false);
        });
    });

    describe('Student Schema', () => {
        it('accepts valid student data', () => {
            const result = createStudentSchema.safeParse({
                name: 'Ahmad Rizki',
                class_id: '550e8400-e29b-41d4-a716-446655440000',
                gender: 'Laki-laki'
            });
            expect(result.success).toBe(true);
        });

        it('rejects invalid gender', () => {
            const result = createStudentSchema.safeParse({
                name: 'Ahmad',
                class_id: '550e8400-e29b-41d4-a716-446655440000',
                gender: 'Invalid'
            });
            expect(result.success).toBe(false);
        });

        it('rejects name with numbers', () => {
            const result = createStudentSchema.safeParse({
                name: 'Ahmad123',
                class_id: '550e8400-e29b-41d4-a716-446655440000',
                gender: 'Laki-laki'
            });
            expect(result.success).toBe(false);
        });
    });

    describe('Task Schema', () => {
        it('accepts valid task data', () => {
            const result = createTaskSchema.safeParse({
                title: 'Koreksi UTS',
                description: 'Koreksi 30 lembar',
                status: 'todo'
            });
            expect(result.success).toBe(true);
        });

        it('rejects short title', () => {
            const result = createTaskSchema.safeParse({
                title: 'AB',
                status: 'todo'
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid status', () => {
            const result = createTaskSchema.safeParse({
                title: 'Valid Title',
                status: 'invalid'
            });
            expect(result.success).toBe(false);
        });
    });

    describe('Attendance Schema', () => {
        it('accepts valid attendance data', () => {
            const result = createAttendanceSchema.safeParse({
                student_id: '550e8400-e29b-41d4-a716-446655440000',
                date: '2024-12-06',
                status: 'Hadir'
            });
            expect(result.success).toBe(true);
        });

        it('rejects invalid date format', () => {
            const result = createAttendanceSchema.safeParse({
                student_id: '550e8400-e29b-41d4-a716-446655440000',
                date: '06-12-2024',
                status: 'Hadir'
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid status', () => {
            const result = createAttendanceSchema.safeParse({
                student_id: '550e8400-e29b-41d4-a716-446655440000',
                date: '2024-12-06',
                status: 'Tidak Valid'
            });
            expect(result.success).toBe(false);
        });
    });

    describe('Schedule Schema', () => {
        it('accepts valid schedule data', () => {
            const result = createScheduleSchema.safeParse({
                day: 'Senin',
                start_time: '08:00',
                end_time: '09:30',
                subject: 'Matematika'
            });
            expect(result.success).toBe(true);
        });

        it('rejects end time before start time', () => {
            const result = createScheduleSchema.safeParse({
                day: 'Senin',
                start_time: '10:00',
                end_time: '09:00',
                subject: 'Matematika'
            });
            expect(result.success).toBe(false);
        });
    });
});

describe('Utility Functions', () => {
    describe('validateData', () => {
        it('returns success with valid data', () => {
            const result = validateData(loginSchema, {
                email: 'test@example.com',
                password: '123456'
            });
            expect(result.success).toBe(true);
        });

        it('returns errors with invalid data', () => {
            const result = validateData(loginSchema, {
                email: 'invalid',
                password: '12'
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.errors).toBeDefined();
            }
        });
    });

    describe('sanitizeHtml', () => {
        it('escapes HTML tags', () => {
            expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        });

        it('escapes special characters', () => {
            expect(sanitizeHtml('Test & "quotes"')).toBe('Test &amp; &quot;quotes&quot;');
        });
    });

    describe('sanitizeInput', () => {
        it('trims whitespace', () => {
            expect(sanitizeInput('  test  ')).toBe('test');
        });

        it('removes angle brackets', () => {
            expect(sanitizeInput('test<script>')).toBe('testscript');
        });
    });
});
