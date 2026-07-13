const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const data = JSON.parse(fs.readFileSync('scripts/final_students.json', 'utf8'));
  
  // Clean data
  const invalidNames = ['nama', 'nama siswa', 'jumlah', 'rerata kelas', 'pembagian kelas'];
  
  for (const [className, students] of Object.entries(data)) {
    console.log(`Processing ${className}...`);
    
    // Clean students
    const validStudents = students.filter(s => {
      const lowerName = s.name.toLowerCase();
      if (invalidNames.some(inv => lowerName.includes(inv))) return false;
      if (s.name.length <= 3) return false;
      return true;
    });
    
    if (validStudents.length === 0) {
      console.log(`No valid students found for ${className}, skipping.`);
      continue;
    }
    
    // Find or create class
    // Some are named "Kelas 2A", some just "2A" etc.
    let searchName = className;
    if (!searchName.toLowerCase().startsWith('kelas')) {
      searchName = `Kelas ${className}`;
    }
    
    // Also try without 'Kelas' just in case
    const altName = className.replace(/kelas\s+/i, '').trim();
    
    const { data: clsData, error: clsError } = await supabase
      .from('classes')
      .select('id')
      .or(`name.eq.${searchName},name.eq.${altName},name.eq.${className}`)
      .single();
      
    let classId;
    if (clsError || !clsData) {
      console.log(`Class ${searchName} not found. Creating it...`);
      const { data: newCls, error: createError } = await supabase
        .from('classes')
        .insert({ name: searchName, user_id: '3946643b-f51d-4378-b139-2df060aba2f4' })
        .select()
        .single();
        
      if (createError) {
        console.error(`Error creating class ${searchName}:`, createError);
        continue;
      }
      classId = newCls.id;
    } else {
      classId = clsData.id;
      console.log(`Found class ${searchName} with ID ${classId}`);
    }

    // Insert students
    const inserts = validStudents.map(s => ({
      name: s.name,
      gender: s.gender === 'laki-laki' || s.gender === 'Laki-laki' ? 'Laki-laki' : 'Perempuan',
      class_id: classId,
      user_id: '3946643b-f51d-4378-b139-2df060aba2f4'
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('students')
      .insert(inserts)
      .select();

    if (insertError) {
      console.error(`Error inserting into ${className}:`, insertError);
    } else {
      console.log(`Successfully inserted ${inserted.length} students into ${className}`);
    }
  }
}

main().catch(console.error);
