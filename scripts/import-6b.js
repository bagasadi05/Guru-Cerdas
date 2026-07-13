import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const classId = '08bf08da-9403-4f62-8214-d12640cc284c'; // Kelas 6B
const creatorUserId = '3dec058b-33d1-491b-bafd-f68a7b5eca72'; // Admin user_id

const rawStudents = [
  { name: 'ALI AVANILLA BAHADD', gender: 'Laki-laki' },
  { name: 'ALISSA FATHIN AZ-ZAHRA', gender: 'Perempuan' },
  { name: 'ALYSSA ARDHANI', gender: 'Perempuan' },
  { name: 'AMELIYA PUTRI SHOLECHAH', gender: 'Perempuan' },
  { name: 'ARSHAD AS-SHIDDIQ SURYAWANGSA', gender: 'Laki-laki' },
  { name: 'ARSHAKA DANISH RAYHAN', gender: 'Laki-laki' },
  { name: 'ARSYAD ANNAFI SETIYONO', gender: 'Laki-laki' },
  { name: 'ATHA PUTRA IRANI', gender: 'Laki-laki' },
  { name: 'DANISWARA ALIF ANARGYA', gender: 'Laki-laki' },
  { name: 'DIPA KHALIFATULLAH ZAHABI', gender: 'Laki-laki' },
  { name: 'EARLYTA ARSYFA SALSABILA RIANTO', gender: 'Perempuan' },
  { name: 'FARREL AKBAR RAHARJA', gender: 'Laki-laki' },
  { name: 'HANS OCTAVILLO FAEYZA SAPUTRA', gender: 'Laki-laki' },
  { name: 'KEANDRA SASKARA RACHMAN', gender: 'Laki-laki' },
  { name: 'LIONEL ALTHAFFITO EL KEYNANDO', gender: 'Laki-laki' },
  { name: 'PRATAMA APTA BASWARA', gender: 'Laki-laki' },
  { name: 'RAFALINO KHALIEF RAHENALBY', gender: 'Laki-laki' },
  { name: 'SHAFAA ASIILAH AYU ANGGARA', gender: 'Perempuan' },
  { name: 'YASMIN HISANAH ZHARIFAH', gender: 'Perempuan' }
];

async function main() {
  console.log(`Starting import of ${rawStudents.length} students into Kelas 6B...`);

  // Check if class exists
  const { data: cls, error: clsError } = await supabase
    .from('classes')
    .select('name')
    .eq('id', classId)
    .single();

  if (clsError || !cls) {
    console.error('Error finding class:', clsError ? clsError.message : 'Not found');
    process.exit(1);
  }
  console.log(`Found class: ${cls.name}`);

  const studentsToInsert = rawStudents.map(s => {
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    return {
      name: s.name,
      gender: s.gender,
      class_id: classId,
      user_id: creatorUserId,
      access_code: accessCode,
      avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(s.name)}&background=random`
    };
  });

  const { data, error } = await supabase
    .from('students')
    .insert(studentsToInsert)
    .select();

  if (error) {
    console.error('Error inserting students:', error.message);
    process.exit(1);
  }

  console.log(`Successfully imported ${data.length} students into Kelas 6B!`);
}

main().catch(console.error);
