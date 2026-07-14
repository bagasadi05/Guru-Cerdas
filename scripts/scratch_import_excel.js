import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = 'e:\\Coding\\Guru-Cerdas\\.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if (key && val) {
    envVars[key.trim()] = val.join('=').trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = envVars['VITE_SUPABASE_URL'] || envVars['SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const filePath = 'e:\\Coding\\Guru-Cerdas\\data\\matched_assignments.json';
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  console.log(`Starting import of ${data.length} assignments...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const assignment of data) {
      // Check if assignment already exists
      const { data: existing, error: checkError } = await supabase
          .from('teacher_class_assignments')
          .select('id')
          .eq('teacher_user_id', assignment.teacher_user_id)
          .eq('class_id', assignment.class_id)
          .eq('semester_id', assignment.semester_id)
          .eq('assignment_role', assignment.assignment_role)
          .eq('subject_name', assignment.subject_name)
          .is('deleted_at', null)
          .maybeSingle();
          
      if (checkError) {
          console.error(`Error checking assignment for ${assignment.teacher_name} - ${assignment.subject_name} (${assignment.class_name}):`, checkError.message);
          errorCount++;
          continue;
      }
      
      if (existing) {
          console.log(`Assignment already exists for ${assignment.teacher_name} - ${assignment.subject_name} (${assignment.class_name}). Skipping.`);
          successCount++;
          continue;
      }
      
      // Insert new assignment
      const { error: insertError } = await supabase
          .from('teacher_class_assignments')
          .insert({
              teacher_user_id: assignment.teacher_user_id,
              class_id: assignment.class_id,
              semester_id: assignment.semester_id,
              assignment_role: assignment.assignment_role,
              subject_name: assignment.subject_name
          });
          
      if (insertError) {
          console.error(`Failed to insert assignment for ${assignment.teacher_name} - ${assignment.subject_name} (${assignment.class_name}):`, insertError.message);
          errorCount++;
      } else {
          console.log(`Successfully inserted assignment for ${assignment.teacher_name} - ${assignment.subject_name} (${assignment.class_name}).`);
          successCount++;
      }
  }
  
  console.log(`\nImport complete!`);
  console.log(`Total: ${data.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${errorCount}`);
}

run().catch(console.error);
