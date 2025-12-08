/**
 * Zod Validation Schemas
 * Strict input validation for all data types
 */

import { z } from 'zod';

// ============================================
// COMMON SCHEMAS
// ============================================

export const idSchema = z.string().uuid('ID harus berupa UUID yang valid');

export const emailSchema = z
    .string()
    .email('Format email tidak valid')
    .min(5, 'Email terlalu pendek')
    .max(100, 'Email terlalu panjang');

export const phoneSchema = z
    .string()
    .regex(/^(\+62|62|0)[0-9]{9,13}$/, 'Format nomor telepon tidak valid (contoh: 081234567890)')
    .optional()
    .nullable();

export const dateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD');

export const timeSchema = z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Format waktu harus HH:MM atau HH:MM:SS');

// ============================================
// AUTH SCHEMAS
// ============================================

export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(6, 'Password minimal 6 karakter')
});

export const signupSchema = z.object({
    email: emailSchema,
    password: z
        .string()
        .min(8, 'Password minimal 8 karakter')
        .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
        .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
        .regex(/[0-9]/, 'Password harus mengandung angka'),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword']
});

export const accessCodeSchema = z
    .string()
    .regex(/^[A-Z0-9]{6}$/, 'Kode akses harus 6 karakter (huruf besar dan angka)')
    .nullable()
    .optional();

// ============================================
// STUDENT SCHEMAS
// ============================================

export const genderSchema = z.enum(['Laki-laki', 'Perempuan'], {
    error: 'Pilih jenis kelamin yang valid'
});

export const studentNameSchema = z
    .string()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .regex(/^[a-zA-Z\s'.]+$/, 'Nama hanya boleh mengandung huruf, spasi, titik, dan apostrof');

export const createStudentSchema = z.object({
    name: studentNameSchema,
    class_id: idSchema,
    gender: genderSchema,
    avatar_url: z.string().url().optional().default(''),
    access_code: accessCodeSchema,
    parent_phone: phoneSchema
});

export const updateStudentSchema = createStudentSchema.partial();

// ============================================
// CLASS SCHEMAS
// ============================================

export const classNameSchema = z
    .string()
    .min(2, 'Nama kelas minimal 2 karakter')
    .max(50, 'Nama kelas maksimal 50 karakter');

export const createClassSchema = z.object({
    name: classNameSchema
});

// ============================================
// TASK SCHEMAS
// ============================================

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done'], {
    error: 'Status tugas tidak valid'
});

export const createTaskSchema = z.object({
    title: z
        .string()
        .min(3, 'Judul tugas minimal 3 karakter')
        .max(200, 'Judul tugas maksimal 200 karakter'),
    description: z
        .string()
        .max(1000, 'Deskripsi maksimal 1000 karakter')
        .optional()
        .nullable(),
    due_date: dateSchema.optional().nullable(),
    status: taskStatusSchema.default('todo')
});

export const updateTaskSchema = createTaskSchema.partial();

// ============================================
// ATTENDANCE SCHEMAS
// ============================================

export const attendanceStatusSchema = z.enum(['Hadir', 'Izin', 'Sakit', 'Alpha'], {
    error: 'Status kehadiran tidak valid'
});

export const createAttendanceSchema = z.object({
    student_id: idSchema,
    date: dateSchema,
    status: attendanceStatusSchema,
    notes: z.string().max(500, 'Catatan maksimal 500 karakter').optional().nullable()
});

// ============================================
// SCHEDULE SCHEMAS
// ============================================

export const daySchema = z.enum(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'], {
    error: 'Hari tidak valid'
});

export const createScheduleSchema = z.object({
    day: daySchema,
    start_time: timeSchema,
    end_time: timeSchema,
    subject: z.string().min(2, 'Nama mata pelajaran minimal 2 karakter').max(100, 'Nama mata pelajaran maksimal 100 karakter'),
    class_id: idSchema.optional().nullable()
}).refine(data => {
    if (data.start_time && data.end_time) {
        return data.start_time < data.end_time;
    }
    return true;
}, {
    message: 'Waktu mulai harus sebelum waktu selesai',
    path: ['end_time']
});

// ============================================
// COMMUNICATION SCHEMAS
// ============================================

export const createMessageSchema = z.object({
    student_id: idSchema,
    message: z
        .string()
        .min(1, 'Pesan tidak boleh kosong')
        .max(2000, 'Pesan maksimal 2000 karakter'),
    sender: z.enum(['teacher', 'parent'])
});

// ============================================
// REPORT SCHEMAS
// ============================================

export const createReportSchema = z.object({
    student_id: idSchema,
    date: dateSchema,
    title: z.string().min(3, 'Judul minimal 3 karakter').max(200, 'Judul maksimal 200 karakter'),
    notes: z.string().min(10, 'Catatan minimal 10 karakter').max(5000, 'Catatan maksimal 5000 karakter'),
    attachment_url: z.string().url().optional().nullable()
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Result type for validation operations
 * 
 * @template T - The type of the validated data
 * 
 * @example
 * ```typescript
 * const result: ValidationResult<User> = validateData(userSchema, userData);
 * if (result.success) {
 *   console.log(result.data); // Typed as User
 * } else {
 *   console.log(result.errors); // Record<string, string[]>
 * }
 * ```
 */
export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; errors: Record<string, string[]> };

/**
 * Validates data against a Zod schema and returns formatted validation results
 * 
 * This function provides a type-safe way to validate data using Zod schemas,
 * with error messages formatted for easy display in forms. All validation
 * errors are collected and returned in a structured format.
 * 
 * @template T - The expected type of the validated data
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate (can be any type)
 * @returns A ValidationResult containing either the validated data or formatted errors
 * 
 * @example
 * ```typescript
 * const result = validateData(loginSchema, { email: 'test@example.com', password: '123' });
 * if (result.success) {
 *   // result.data is typed and validated
 *   console.log('Valid:', result.data);
 * } else {
 *   // result.errors contains field-specific error messages
 *   console.log('Errors:', result.errors);
 *   // { password: ['Password minimal 6 karakter'] }
 * }
 * ```
 * 
 * @since 1.0.0
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors: Record<string, string[]> = {};
    // Zod v4 uses 'issues' instead of 'errors'
    const issues = (result.error as any).issues || (result.error as any).errors || [];
    issues.forEach((issue: any) => {
        const path = (issue.path || []).join('.');
        if (!errors[path]) {
            errors[path] = [];
        }
        errors[path].push(issue.message);
    });

    return { success: false, errors };
}

/**
 * Sanitizes HTML content to prevent Cross-Site Scripting (XSS) attacks
 * 
 * This function escapes all HTML special characters to their entity equivalents,
 * preventing malicious scripts from being executed when the content is rendered.
 * Use this function when displaying user-generated content that may contain HTML.
 * 
 * @param input - The HTML string to sanitize
 * @returns The sanitized string with all HTML special characters escaped
 * 
 * @example
 * ```typescript
 * const userInput = '<script>alert("XSS")</script>';
 * const safe = sanitizeHtml(userInput);
 * console.log(safe); // '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 * ```
 * 
 * @example
 * ```typescript
 * // Safe to render in HTML
 * const comment = sanitizeHtml(userComment);
 * element.innerHTML = comment; // No XSS risk
 * ```
 * 
 * @see {@link sanitizeInput} for general input sanitization
 * @since 1.0.0
 */
export function sanitizeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitizes user input by removing potentially dangerous characters
 * 
 * This function trims whitespace and removes angle brackets that could be used
 * for HTML injection or other attacks. Use this for general text input that
 * will be stored in the database or displayed to users.
 * 
 * Note: This provides basic sanitization. For HTML content, use {@link sanitizeHtml}.
 * For database queries, use parameterized queries instead of string concatenation.
 * 
 * @param input - The user input string to sanitize
 * @returns The sanitized string with whitespace trimmed and angle brackets removed
 * 
 * @example
 * ```typescript
 * const userInput = '  <script>Hello</script>  ';
 * const clean = sanitizeInput(userInput);
 * console.log(clean); // 'scriptHello/script'
 * ```
 * 
 * @example
 * ```typescript
 * // Use in form handlers
 * const cleanName = sanitizeInput(formData.name);
 * await saveToDatabase({ name: cleanName });
 * ```
 * 
 * @see {@link sanitizeHtml} for HTML-specific sanitization
 * @since 1.0.0
 */
export function sanitizeInput(input: string): string {
    return input.trim().replace(/[<>]/g, '');
}

// Export all schemas for form validation
export const schemas = {
    login: loginSchema,
    signup: signupSchema,
    student: createStudentSchema,
    updateStudent: updateStudentSchema,
    class: createClassSchema,
    task: createTaskSchema,
    updateTask: updateTaskSchema,
    attendance: createAttendanceSchema,
    schedule: createScheduleSchema,
    message: createMessageSchema,
    report: createReportSchema
};
