import os

files = [
    "src/components/pages/AnalyticsPage.tsx",
    "src/components/pages/JurnalMengajarPage.tsx",
    "src/components/pages/analytics/OverviewTab.tsx",
    "src/components/pages/analytics/useAnalyticsData.ts",
    "src/contexts/SemesterContext.tsx"
]

for file_path in files:
    full_path = os.path.join(r"d:\coding\Guru Cerdas", file_path)
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(
        " || userRole === 'waka_kurikulum' || userRole === 'waka_kurikulum'",
        " || userRole === 'waka_kurikulum'"
    )
    
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Duplicates fixed.")
