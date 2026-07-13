import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const walasList = [
  { className: 'Kelas 1A', walas: 'Nita Fitriani', asisten: 'Ria Dewi' },
  { className: 'Kelas 1B', walas: 'Dian Ratnawati', asisten: 'Doto' },
  { className: 'Kelas 1C', walas: 'Zakiya Sulfah', asisten: 'Mukhibun Nashikhin' },
  { className: 'Kelas 2A', walas: 'Purbasari Cahyaningrum', asisten: null },
  { className: 'Kelas 2B', walas: 'Ayu Kurniawati', asisten: null },
  { className: 'Kelas 2C', walas: 'Muzdalifah Cahya Ningrum', asisten: null },
  { className: 'Kelas 3A', walas: 'Bagas Riyadi', asisten: null },
  { className: 'Kelas 3B', walas: 'Ruchana Ambarwati', asisten: null },
  { className: 'Kelas 3C', walas: 'Destyari Pawitra Sari', asisten: null },
  { className: 'Kelas 4A', walas: 'Ratna Setianingrum', asisten: null },
  { className: 'Kelas 4B', walas: 'Irene Saraswaty', asisten: null },
  { className: 'Kelas 4C', walas: 'Siti Fathonah', asisten: null },
  { className: 'Kelas 5A', walas: 'Maratun Sholikhah', asisten: null },
  { className: 'Kelas 5B', walas: 'Anwarul Muniroh', asisten: null },
  { className: 'Kelas 5C', walas: 'Putri Nur Anggraini', asisten: null },
  { className: 'Kelas 5D', walas: 'Dini Hardiningsih', asisten: null },
  { className: 'Kelas 6A', walas: 'Joko Nugroho', asisten: null },
  { className: 'Kelas 6B', walas: 'Leni Herawati', asisten: null },
  { className: 'Kelas 6C', walas: 'Milatus Sadiyyah', asisten: null }, // Handled quote
  { className: 'Kelas 6D', walas: 'Syarif Hidayah', asisten: null },
];

async function run() {
  const { data: users } = await supabase.from('user_roles').select('*').eq('role', 'teacher');
  const { data: classes } = await supabase.from('classes').select('*').is('deleted_at', null);
  const { data: semesters } = await supabase.from('semesters').select('*').eq('is_active', true);
  
  if (!semesters || semesters.length === 0) return;
  const activeSemester = semesters[0];
  
  // Clean up ALL existing homeroom assignments for active semester
  console.log('Deleting existing homeroom assignments...');
  await supabase.from('teacher_class_assignments')
    .delete()
    .eq('assignment_role', 'homeroom')
    .eq('semester_id', activeSemester.id);
    
  const normalize = (str) => {
    if (!str) return '';
    return str.toString().toLowerCase().replace(/[^a-z]/g, '');
  };

  const assignmentsToInsert = [];
  
  for (const item of walasList) {
    const matchedClass = classes?.find(c => c.name.toLowerCase() === item.className.toLowerCase());
    if (!matchedClass) {
      console.warn(`Class not found: ${item.className}`);
      continue;
    }
    
    // Find Walas
    if (item.walas) {
      const normWalas = normalize(item.walas);
      const walasUser = users?.find(u => normalize(u.full_name).includes(normWalas));
      if (walasUser) {
        assignmentsToInsert.push({
          teacher_user_id: walasUser.user_id,
          class_id: matchedClass.id,
          semester_id: activeSemester.id,
          assignment_role: 'homeroom',
          notes: 'Walas'
        });
        
        // Also update the historical classes.user_id just in case
        await supabase.from('classes').update({ user_id: walasUser.user_id }).eq('id', matchedClass.id);
      } else {
        console.warn(`User not found for Walas: ${item.walas}`);
      }
    }
    
    // Find Asisten
    if (item.asisten) {
      const normAsis = normalize(item.asisten);
      const asisUser = users?.find(u => normalize(u.full_name).includes(normAsis));
      if (asisUser) {
        assignmentsToInsert.push({
          teacher_user_id: asisUser.user_id,
          class_id: matchedClass.id,
          semester_id: activeSemester.id,
          assignment_role: 'homeroom',
          notes: 'Asisten'
        });
      } else {
        console.warn(`User not found for Asisten: ${item.asisten}`);
      }
    }
  }
  
  if (assignmentsToInsert.length > 0) {
    const { error } = await supabase.from('teacher_class_assignments').insert(assignmentsToInsert);
    if (error) console.error('Error inserting:', error);
    else console.log(`Successfully inserted ${assignmentsToInsert.length} walas/asisten assignments.`);
  }
}

run().catch(console.error);
