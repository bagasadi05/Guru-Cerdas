import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fddvcyqbfqydvsfujcxd.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error("No anon key");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpsert() {
  const { data, error } = await supabase.from('attendance').upsert([{
    id: '021af528-983a-4435-9ece-41742896e2fb', // random id
    student_id: '3e27cd59-cb27-4fec-a1fb-b8cd9c474ac3',
    date: '2026-01-07',
    status: 'Hadir',
    teacher_status: 'Hadir',
    teacher_id: 'b0d1fe42-a5a2-42a4-bb48-551d818f0927',
    user_id: 'b0d1fe42-a5a2-42a4-bb48-551d818f0927',
    semester_id: 'edf4b2e0-2a25-48b0-be10-22d1d8594a77'
  }], { onConflict: 'student_id,date' });
  
  console.log("Error:", error);
  console.log("Data:", data);
}

testUpsert();
