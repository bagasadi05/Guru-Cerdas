import psycopg2

db_url = 'postgresql://postgres.fddvcyqbfqydvsfujcxd:gusnhde1903@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("""
    SELECT u.id, u.full_name, r.role
    FROM users u
    LEFT JOIN user_roles r ON u.id = r.user_id
    WHERE u.full_name ILIKE '%fitri%'
    """)
    rows = cur.fetchall()
    print("Found users matching 'fitri':")
    for row in rows:
        print(row)
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
