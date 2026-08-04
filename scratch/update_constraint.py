import psycopg2
conn = psycopg2.connect('postgresql://postgres.fddvcyqbfqydvsfujcxd:gusnhde1903@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
cur = conn.cursor()

try:
    cur.execute("""
    ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
    ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN ('admin', 'guru', 'wali_kelas', 'teacher', 'kepala_madrasah', 'waka_kesiswaan', 'waka_kurikulum', 'student', 'parent', 'user'));
    """)
    conn.commit()
    print("Updated check constraint")
    
    cur.execute("UPDATE user_roles SET role = 'waka_kurikulum' WHERE user_id = '4d97411b-2e53-4b76-a4dd-3f316143eed9'")
    conn.commit()
    print("Updated Nita Fitriani's role to waka_kurikulum")
except Exception as e:
    conn.rollback()
    print("Error:", e)
    
conn.close()
