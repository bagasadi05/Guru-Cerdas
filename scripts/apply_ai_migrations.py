import os
import glob
import json

migrations = [
    "supabase/migrations/20260722150000_modul_ajar_database_driven.sql",
    "supabase/migrations/20260722150100_seed_modul_ajar_data.sql",
    "supabase/migrations/20260722180000_seed_comprehensive_modul_ajar_bank.sql",
    "supabase/migrations/20260722190000_p2_constraints_and_tp_seed.sql",
    "supabase/migrations/20260722200000_create_modul_ajar_ai_pipeline.sql",
    "supabase/migrations/20260723000000_remediate_modul_ajar_ai_schema.sql",
    "supabase/migrations/20260723010000_remediate_ai_job_ownership_and_rls.sql"
]

print("Migrations to execute:")
for m in migrations:
    exists = os.path.exists(m)
    print(f" - {m}: {'EXISTS' if exists else 'NOT FOUND'}")
