import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env file manually
const envPath = path.resolve('e:/Coding/Guru-Cerdas/.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.substring(1, value.length - 1);
    }
    env[key] = value.trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const missingTeachers = [
  { name: "Athfal Muta'allim Aziz, S. Pd.", email: "athfal.aziz@guru.local" },
  { name: "Nur Hadi, S. Pd.", email: "nur.hadi@guru.local" }
];

async function run() {
  console.log("Registering missing teachers...");
  for (const teacher of missingTeachers) {
    const password = "GuruCerdas123!";
    console.log(`Creating user: ${teacher.name} (${teacher.email})...`);
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: teacher.email,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: teacher.name }
    });

    if (authError) {
      if (authError.message.includes('already been registered') || authError.message.includes('already exists')) {
        console.log(`[SKIP] Email ${teacher.email} already registered.`);
        // Let's get the user id
        const { data: existingUsers } = await supabase.from('user_roles').select('user_id').eq('email', teacher.email).limit(1);
        if (existingUsers && existingUsers.length > 0) {
          console.log(`Found existing user ID: ${existingUsers[0].user_id}`);
          continue;
        }
      } else {
        console.error(`Error creating ${teacher.name}:`, authError.message);
        continue;
      }
    }

    const userId = authData?.user?.id;
    if (userId) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
          user_id: userId,
          email: teacher.email,
          full_name: teacher.name,
          role: 'teacher'
        }, { onConflict: 'user_id' });

      if (roleError) {
        console.error(`Error inserting role for ${teacher.name}:`, roleError.message);
      } else {
        console.log(`[OK] Successfully registered ${teacher.name}`);
      }
    }
  }
}

run().catch(console.error);
