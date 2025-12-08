# Database Functions (RPC)

Portal Guru menggunakan beberapa Remote Procedure Calls (RPC) di PostgreSQL untuk operasi kompleks yang memerlukan logika server-side.

## Table of Contents

1. [Authentication Functions](#authentication-functions)
2. [Analytics Functions](#analytics-functions)
3. [Data Management Functions](#data-management-functions)
4. [Usage Examples](#usage-examples)

---

## Authentication Functions

### `verify_access_code`

Memverifikasi kode akses siswa untuk portal orang tua.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `access_code_param` | text | Kode akses 6 digit |

**Returns:** Table containing student `id` and `access_code` if valid.

**Example:**
```typescript
const { data, error } = await supabase.rpc('verify_access_code', {
    access_code_param: 'ABC123'
});

if (data && data.length > 0) {
    console.log('Student ID:', data[0].id);
}
```

---

### `delete_user_account`

Menghapus akun pengguna beserta semua data terkait.

**Parameters:** None (uses authenticated user)

**Returns:** void

**Example:**
```typescript
const { error } = await supabase.rpc('delete_user_account');

if (!error) {
    console.log('Account deleted successfully');
    await supabase.auth.signOut();
}
```

---

## Analytics Functions

### `get_daily_attendance_summary`

Mengambil ringkasan kehadiran untuk tanggal tertentu.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `for_date` | date | Tanggal yang ingin diambil |

**Returns:**
| Column | Type | Description |
|--------|------|-------------|
| `present_percentage` | numeric | Persentase hadir |
| `permission_percentage` | numeric | Persentase izin |
| `sick_percentage` | numeric | Persentase sakit |
| `absent_percentage` | numeric | Persentase alpha |

**Example:**
```typescript
const { data, error } = await supabase.rpc('get_daily_attendance_summary', {
    for_date: '2024-12-06'
});

if (data && data.length > 0) {
    const summary = data[0];
    console.log(`Hadir: ${summary.present_percentage}%`);
    console.log(`Izin: ${summary.permission_percentage}%`);
    console.log(`Sakit: ${summary.sick_percentage}%`);
    console.log(`Alpha: ${summary.absent_percentage}%`);
}
```

---

### `get_weekly_attendance_summary`

Mengambil ringkasan kehadiran mingguan untuk grafik.

**Parameters:** None

**Returns:**
| Column | Type | Description |
|--------|------|-------------|
| `day` | text | Nama hari (Senin-Jumat) |
| `present_percentage` | numeric | Persentase kehadiran |

**Example:**
```typescript
const { data, error } = await supabase.rpc('get_weekly_attendance_summary');

// Data untuk chart
const chartData = data.map(d => ({
    name: d.day,
    value: d.present_percentage
}));
```

---

## Data Management Functions

### `get_student_portal_data`

Mengambil semua data siswa untuk portal orang tua setelah verifikasi.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `student_id_param` | uuid | ID siswa |
| `access_code_param` | text | Kode akses siswa |

**Returns:** Complex object containing:
- `student` - Data siswa dengan kelas
- `reports` - Laporan harian
- `attendanceRecords` - Rekam kehadiran
- `academicRecords` - Nilai akademik
- `violations` - Catatan pelanggaran
- `quizPoints` - Poin quiz
- `communications` - Pesan komunikasi
- `teacher` - Info guru

**Example:**
```typescript
const { data, error } = await supabase.rpc('get_student_portal_data', {
    student_id_param: 'student-uuid',
    access_code_param: 'ABC123'
});

if (data && data.length > 0) {
    const studentData = data[0];
    console.log('Student:', studentData.student);
    console.log('Academic Records:', studentData.academicRecords);
}
```

---

### `apply_quiz_points_to_grade`

Menerapkan poin quiz ke nilai akademik siswa.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `student_id_param` | uuid | ID siswa |
| `subject_param` | text | Mata pelajaran |
| `user_id_param` | uuid | ID guru |

**Returns:** void

**Example:**
```typescript
const { error } = await supabase.rpc('apply_quiz_points_to_grade', {
    student_id_param: 'student-uuid',
    subject_param: 'Matematika',
    user_id_param: user.id
});

if (!error) {
    console.log('Quiz points applied to grades');
}
```

---

### `send_parent_message`

Mengirim pesan dari orang tua ke guru.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `student_id_param` | uuid | ID siswa |
| `access_code_param` | text | Kode akses siswa |
| `message_param` | text | Isi pesan |
| `teacher_user_id_param` | uuid | ID guru |

**Returns:** void

**Example:**
```typescript
const { error } = await supabase.rpc('send_parent_message', {
    student_id_param: 'student-uuid',
    access_code_param: 'ABC123',
    message_param: 'Terima kasih atas informasinya, Bu.',
    teacher_user_id_param: 'teacher-uuid'
});
```

---

### `update_parent_message`

Mengupdate pesan yang sudah dikirim.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `student_id_param` | uuid | ID siswa |
| `access_code_param` | text | Kode akses |
| `message_id_param` | uuid | ID pesan |
| `new_message_param` | text | Pesan baru |

---

### `delete_parent_message`

Menghapus pesan dari orang tua.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `student_id_param` | uuid | ID siswa |
| `access_code_param` | text | Kode akses |
| `message_id_param` | uuid | ID pesan |

---

## Creating New Functions

### Guidelines

1. **Use RLS context**: Access `auth.uid()` for current user
2. **Return types**: Define explicit return types
3. **Error handling**: Use `RAISE EXCEPTION` for errors
4. **Security**: Add `SECURITY DEFINER` sparingly

### Template

```sql
CREATE OR REPLACE FUNCTION my_function(
    param1 TEXT,
    param2 UUID
)
RETURNS TABLE (
    column1 TEXT,
    column2 INTEGER
)
LANGUAGE plpgsql
SECURITY INVOKER  -- Uses caller's permissions
AS $$
BEGIN
    -- Verify user is authenticated
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT column1, column2
    FROM my_table
    WHERE user_id = auth.uid()
    AND some_column = param1;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION my_function TO authenticated;
```

---

## Related Documentation

- [Database Tables](./tables.md)
- [Database Types](./types.md)
- [Security Architecture](../../architecture/security.md)
