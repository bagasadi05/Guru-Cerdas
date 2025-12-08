# Database Types

Portal Guru menggunakan beberapa custom types di PostgreSQL untuk validasi data dan kejelasan schema.

## Table of Contents

1. [Enum Types](#enum-types)
2. [Composite Types](#composite-types)
3. [TypeScript Type Mappings](#typescript-type-mappings)
4. [Generating Types](#generating-types)

---

## Enum Types

### `attendance_status`

Status kehadiran siswa.

| Value | Description |
|-------|-------------|
| `Hadir` | Siswa hadir |
| `Izin` | Siswa izin dengan keterangan |
| `Sakit` | Siswa sakit |
| `Alpha` | Siswa absen tanpa keterangan |

**SQL Definition:**
```sql
CREATE TYPE attendance_status AS ENUM ('Hadir', 'Izin', 'Sakit', 'Alpha');
```

**Usage:**
```sql
-- In table definition
CREATE TABLE attendance (
    status attendance_status NOT NULL DEFAULT 'Hadir'
);

-- In queries
SELECT * FROM attendance WHERE status = 'Hadir';
```

---

### `day_of_week`

Hari dalam seminggu untuk jadwal.

| Value | Description |
|-------|-------------|
| `Senin` | Monday |
| `Selasa` | Tuesday |
| `Rabu` | Wednesday |
| `Kamis` | Thursday |
| `Jumat` | Friday |

**SQL Definition:**
```sql
CREATE TYPE day_of_week AS ENUM ('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat');
```

**Usage:**
```sql
-- In table definition
CREATE TABLE schedules (
    day day_of_week NOT NULL
);

-- Query by day
SELECT * FROM schedules WHERE day = 'Senin' ORDER BY start_time;
```

---

### `task_status`

Status tugas guru (to-do list).

| Value | Description |
|-------|-------------|
| `todo` | Belum dikerjakan |
| `in_progress` | Sedang dikerjakan |
| `done` | Selesai |

**Note:** Didefinisikan sebagai text constraint, bukan enum:

```sql
CREATE TABLE tasks (
    status TEXT NOT NULL DEFAULT 'todo' 
    CHECK (status IN ('todo', 'in_progress', 'done'))
);
```

---

### `gender`

Jenis kelamin siswa.

| Value | Description |
|-------|-------------|
| `Laki-laki` | Male |
| `Perempuan` | Female |

**Note:** Didefinisikan sebagai text constraint:

```sql
CREATE TABLE students (
    gender TEXT NOT NULL 
    CHECK (gender IN ('Laki-laki', 'Perempuan'))
);
```

---

### `message_sender`

Pengirim pesan dalam komunikasi.

| Value | Description |
|-------|-------------|
| `teacher` | Pesan dari guru |
| `parent` | Pesan dari orang tua |

---

## Composite Types

Portal Guru tidak menggunakan composite types secara langsung, tetapi RPC functions mengembalikan complex types.

### Return Type dari `get_student_portal_data`

```typescript
type StudentPortalData = {
    student: {
        id: string;
        name: string;
        avatar_url: string;
        user_id: string;
        classes: { name: string };
    };
    reports: Array<{
        id: string;
        date: string;
        title: string;
        notes: string;
    }>;
    attendanceRecords: Array<{
        id: string;
        date: string;
        status: 'Hadir' | 'Izin' | 'Sakit' | 'Alpha';
        notes: string | null;
    }>;
    academicRecords: Array<{
        id: string;
        subject: string;
        score: number;
        notes: string;
        created_at: string;
        assessment_name: string | null;
    }>;
    violations: Array<{
        id: string;
        date: string;
        description: string;
        points: number;
    }>;
    quizPoints: Array<{
        id: number;
        quiz_date: string;
        subject: string;
        quiz_name: string;
        points: number;
        max_points: number;
    }>;
    communications: Array<{
        id: string;
        created_at: string;
        message: string;
        sender: 'teacher' | 'parent';
        is_read: boolean;
    }>;
    teacher: {
        user_id: string;
        name: string;
        avatar_url: string;
    } | null;
};
```

---

## TypeScript Type Mappings

### Database Types File

Types are defined in `src/services/database.types.ts`:

```typescript
// This file is generated from Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          name: string;
          class_id: string;
          avatar_url: string;
          user_id: string;
          created_at: string;
          gender: "Laki-laki" | "Perempuan";
          access_code: string | null;
          parent_phone: string | null;
          deleted_at: string | null;
        };
        Insert: { ... };
        Update: { ... };
        Relationships: [];
      };
      // ... other tables
    };
    Enums: {
      attendance_status: "Hadir" | "Izin" | "Sakit" | "Alpha";
      day_of_week: "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat";
    };
  };
};
```

### Using Types in Code

```typescript
import { Database } from './services/database.types';

// Table row types
type Student = Database['public']['Tables']['students']['Row'];
type Attendance = Database['public']['Tables']['attendance']['Row'];

// Enum types
type AttendanceStatus = Database['public']['Enums']['attendance_status'];
type DayOfWeek = Database['public']['Enums']['day_of_week'];

// Function usage
const student: Student = {
    id: 'uuid',
    name: 'Ahmad',
    class_id: 'class-uuid',
    avatar_url: 'https://...',
    user_id: 'user-uuid',
    created_at: '2024-01-01T00:00:00Z',
    gender: 'Laki-laki',
    access_code: null,
    parent_phone: null,
    deleted_at: null
};
```

---

## Generating Types

### Using Supabase CLI

Generate types from your Supabase project:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Generate types
supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > src/services/database.types.ts
```

### Automatic Generation

Add to package.json:

```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/services/database.types.ts"
  }
}
```

### Manual Updates

If you add new tables or columns:

1. Update the database first
2. Regenerate types: `npm run db:types`
3. Update any affected code

---

## Best Practices

### Type Safety

```typescript
// ✅ Good - Import types from database.types.ts
import { Database } from './database.types';
type Student = Database['public']['Tables']['students']['Row'];

// ❌ Bad - Define types manually
interface Student {
    id: string;
    name: string;
    // ... might get out of sync
}
```

### Null Handling

```typescript
// Fields that can be null
const student: Student = { ... };

// Check for null before using
if (student.access_code) {
    console.log(`Access code: ${student.access_code}`);
}

// Or use nullish coalescing
const phone = student.parent_phone ?? 'Tidak tersedia';
```

### Enum Validation

```typescript
// TypeScript will catch invalid values
const status: AttendanceStatus = 'Hadir'; // ✅
const invalid: AttendanceStatus = 'Present'; // ❌ Type error
```

---

## Related Documentation

- [Database Tables](./tables.md)
- [Database Functions](./functions.md)
- [TypeScript in Portal Guru](../../guides/contributing.md#typescript)
