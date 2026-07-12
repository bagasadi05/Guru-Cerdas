import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: VITE_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus di-set di .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const assignments = [
  { class: "1A", homeroom: "Nita Fitriani, S. Pd", assistant: "Ria Dewi Nurhandayani, S. Pd" },
  { class: "1B", homeroom: "Dian Ratnawati, S. Pd", assistant: "Doto, S. Pd" },
  { class: "1C", homeroom: "Zakiya Sulfah, S. Pd", assistant: "Mukhibun Nashikhin, S. Kom" },
  { class: "2A", homeroom: "Purbasari Cahyaningrum, S. Pd", assistant: null },
  { class: "2B", homeroom: "Ayu Kurniawati, S. Pd", assistant: null },
  { class: "2C", homeroom: "Muzdalifah Cahya Ningrum, S. Pd", assistant: null },
  { class: "3A", homeroom: "Bagas Riyadi, S. Pd", assistant: null },
  { class: "3B", homeroom: "Ruchana Ambarwati, S. Pd", assistant: null },
  { class: "3C", homeroom: "Destyari Pawitra Sari, S. Pd.", assistant: null },
  { class: "4A", homeroom: "Ratna Setianingrum, S. Pd.", assistant: null },
  { class: "4B", homeroom: "Irene Saraswaty, S.S", assistant: null },
  { class: "4C", "homeroom": "Siti Fathonah, S. Pd", assistant: null },
  { class: "5A", "homeroom": "Maratun Sholikhah", assistant: null },
  { class: "5B", "homeroom": "Anwarul Muniroh, M. Pd", assistant: null },
  { class: "5C", "homeroom": "Putri Nur Anggraini, S. Pd.", assistant: null },
  { class: "5D", "homeroom": "Dini Hardiningsih, S. Pd", assistant: null },
  { class: "6A", "homeroom": "Joko Nugroho, S. Pd.", assistant: null },
  { class: "6B", "homeroom": "Leni Herawati, S. Pd.", assistant: null },
  { class: "6C", "homeroom": "Milatus Sa'diyyah, S. Pd", assistant: null },
  { class: "6D", "homeroom": "Syarif Hidayah Al Azhar, S.Pd", assistant: null }
];

async function run() {
  let { data: semesters } = await supabase.from('semesters').select('id, name').order('created_at', { ascending: false }).limit(1);
  if (!semesters || semesters.length === 0) {
    console.error('Tidak ada semester sama sekali di database! Anda harus membuat semester terlebih dahulu.');
    process.exit(1);
  }
  const semesterId = semesters[0].id;
  console.log(`Menggunakan Semester Aktif: ${semesters[0].name} (${semesterId})`);

  // 2. Get all teachers
  const { data: teachers } = await supabase.from('user_roles').select('*').eq('role', 'teacher');
  const findTeacher = async (nameStr) => {
    if (!nameStr) return null;
    let cleanName = nameStr.split(',')[0].trim().toLowerCase().replace('riyadi', 'riadi').replace('setianingrum', 'setyaningrum');
    
    // Attempt to find in existing list
    let found = teachers.find(t => t.full_name && t.full_name.toLowerCase().includes(cleanName));
    
    if (!found) {
      console.error(`\n❌ ERROR: Guru tidak ditemukan di DB: "${nameStr}"`);
      console.error(`Silakan daftarkan guru ini terlebih dahulu melalui file CSV utama atau Panel Admin.`);
      console.error(`Pastikan penulisan nama di daftar assignments cocok dengan nama di database.`);
      process.exit(1);
    }
    return found;
  };

  const adminUserId = teachers[0]?.user_id; // Just use any valid user for created_by

  let totalAssignments = 0;

  for (const item of assignments) {
    const className = `Kelas ${item.class}`;
    const gradeLevel = parseInt(item.class[0]);
    
    // 3. Find or create class
    let classId = null;
    const { data: existingClasses } = await supabase
      .from('classes')
      .select('id')
      .eq('name', className)
      .eq('academic_year', '2026/2027')
      .limit(1);
      
    if (existingClasses && existingClasses.length > 0) {
      classId = existingClasses[0].id;
    } else {
      const { data: newClass } = await supabase
        .from('classes')
        .insert({
          name: className,
          grade_level: gradeLevel,
          academic_year: '2026/2027',
          user_id: adminUserId,
          is_archived: false
        })
        .select().single();
      classId = newClass.id;
      console.log(`Dibuat Kelas ${className}`);
    }

    // 4. Assign Homeroom
    const homeroomTeacher = await findTeacher(item.homeroom);
    if (homeroomTeacher) {
      const { data: existingAssignment } = await supabase.from('teacher_class_assignments')
        .select('id').eq('teacher_user_id', homeroomTeacher.user_id).eq('class_id', classId)
        .eq('semester_id', semesterId).eq('assignment_role', 'homeroom').limit(1);
        
      if (!existingAssignment || existingAssignment.length === 0) {
        const { error } = await supabase.from('teacher_class_assignments').insert({
          teacher_user_id: homeroomTeacher.user_id,
          class_id: classId,
          semester_id: semesterId,
          assignment_role: 'homeroom',
          created_by: adminUserId
        });
        if (error) console.error(`Error assign walas ${item.class}:`, error.message);
        else totalAssignments++;
      }
    }

    // 5. Assign Assistant
    if (item.assistant) {
      const assistantTeacher = await findTeacher(item.assistant);
      if (assistantTeacher) {
        const { data: existingAssignment } = await supabase.from('teacher_class_assignments')
          .select('id').eq('teacher_user_id', assistantTeacher.user_id).eq('class_id', classId)
          .eq('semester_id', semesterId).eq('assignment_role', 'assistant').limit(1);
          
        if (!existingAssignment || existingAssignment.length === 0) {
          const { error } = await supabase.from('teacher_class_assignments').insert({
            teacher_user_id: assistantTeacher.user_id,
            class_id: classId,
            semester_id: semesterId,
            assignment_role: 'assistant',
            created_by: adminUserId
          });
          if (error) console.error(`Error assign asisten ${item.class}:`, error.message);
          else totalAssignments++;
        }
      }
    }
  }

  console.log(`Berhasil menambahkan ${totalAssignments} penugasan!`);
}

run().catch(console.error);
