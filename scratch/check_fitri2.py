import psycopg2
conn = psycopg2.connect('postgresql://postgres.fddvcyqbfqydvsfujcxd:gusnhde1903@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres')
cur = conn.cursor()
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
tables = cur.fetchall()
print("Tables:", tables)

print("Checking auth.users for fitri")
cur.execute("SELECT id, raw_user_meta_data FROM auth.users WHERE raw_user_meta_data->>'full_name' ILIKE '%fitri%'")
for r in cur.fetchall():
    print(r)
    
print("Checking user_roles table")
cur.execute("SELECT * FROM user_roles WHERE user_id IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'full_name' ILIKE '%fitri%')")
for r in cur.fetchall():
    print(r)
    
