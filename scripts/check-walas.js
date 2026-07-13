import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const { data: users } = await supabase.from('user_roles').select('*');
  const { data: classes } = await supabase.from('classes').select('*').is('deleted_at', null);
  const { data: assignments } = await supabase.from('teacher_class_assignments')
    .select('*')
    .eq('assignment_role', 'homeroom')
    .is('deleted_at', null);
    
  if (!classes) {
    console.error('No classes found or error occurred.');
    return;
  }
  
  const userMap = {};
  users?.forEach(u => userMap[u.user_id] = u.full_name);
  
  const classMap = {};
  classes?.forEach(c => classMap[c.id] = c.name);
  
  console.log('--- Classes and their user_id (Historical Walas) ---');
  classes.forEach(c => {
    console.log(`${c.name}: ${userMap[c.user_id] || 'None'} (user_id: ${c.user_id})`);
  });
  
  console.log('\n--- Homeroom Assignments (teacher_class_assignments) ---');
  assignments?.forEach(a => {
    console.log(`${classMap[a.class_id] || 'Unknown Class'}: ${userMap[a.teacher_user_id] || 'Unknown User'}`);
  });
}

run().catch(console.error);
