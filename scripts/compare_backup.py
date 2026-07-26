import json

backup_file = "data/backups_daily_2026-07-22T19-00-04-637Z_backup.json"

with open(backup_file, "r", encoding="utf-8") as f:
    backup = json.load(f)

tables = backup.get("data", {})
print("--- BACKUP SUMMARY ---")
print("Version:", backup.get("version"))
print("Created at:", backup.get("created_at"))
print("Total rows:", backup.get("total_rows"))
print("\nTables in backup:")
for t_name, rows in tables.items():
    print(f" - {t_name}: {len(rows)} rows")

# Breakdown students in backup by class_id or class_name
students = tables.get("students", [])
classes = {c["id"]: c["name"] for c in tables.get("classes", [])}

by_class = {}
active_students_backup = 0
soft_deleted_students_backup = 0

for s in students:
    c_id = s.get("class_id")
    c_name = classes.get(c_id, f"Unknown ID ({c_id})")
    is_deleted = s.get("deleted_at") is not None
    if is_deleted:
        soft_deleted_students_backup += 1
    else:
        active_students_backup += 1
    
    if c_name not in by_class:
        by_class[c_name] = {"active": 0, "deleted": 0, "students": []}
    
    if is_deleted:
        by_class[c_name]["deleted"] += 1
    else:
        by_class[c_name]["active"] += 1
        by_class[c_name]["students"].append(s["name"])

print("\n--- BACKUP STUDENTS BREAKDOWN BY CLASS ---")
print(f"Total students in backup: {len(students)} (Active: {active_students_backup}, Deleted: {soft_deleted_students_backup})")
for c_name in sorted(by_class.keys()):
    info = by_class[c_name]
    print(f" * {c_name}: {info['active']} active, {info['deleted']} soft-deleted")

with open("scripts/backup_breakdown.json", "w") as out:
    json.dump(by_class, out, indent=2)
