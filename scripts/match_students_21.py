import json

backup_21 = json.load(open("data/backups_daily_2026-07-21T19-00-05-027Z_backup.json", "r", encoding="utf-8"))
tables_21 = backup_21.get("data", {})
students_21 = tables_21.get("students", [])
classes_21 = {c["id"]: c["name"] for c in tables_21.get("classes", [])}

active_21 = {}
for s in students_21:
    if s.get("deleted_at") is None:
        c_name = classes_21.get(s.get("class_id"), "Unknown")
        active_21.setdefault(c_name, []).append(s["name"])

print("--- JULY 21 BACKUP ACTIVE STUDENTS COUNT ---")
total_21 = 0
for c_name, names in sorted(active_21.items()):
    print(f" - {c_name}: {len(names)} students")
    total_21 += len(names)

print(f"Total active in July 21 backup: {total_21}")
