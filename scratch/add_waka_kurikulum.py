import os
import re

files_to_update = [
    "src/components/dashboard/DashboardGreeting.tsx",
    "src/components/dashboard/SchoolStatsGrid.tsx",
    "src/components/navigation/DashboardSidebar.tsx",
    "src/components/navigation/menuRegistry.ts",
    "src/components/pages/AnalyticsPage.tsx",
    "src/components/pages/DashboardPage.tsx",
    "src/components/pages/ExtracurricularPage.tsx",
    "src/components/pages/JurnalMengajarPage.tsx",
    "src/components/pages/StudentDetailPage.tsx",
    "src/components/pages/StudentsPage.tsx",
    "src/components/pages/TindakLanjutPage.tsx",
    "src/components/pages/admin/TeacherAssignmentsTab.tsx",
    "src/components/pages/admin/UsersTab.tsx",
    "src/components/pages/analytics/OverviewTab.tsx",
    "src/components/pages/analytics/useAnalyticsData.ts",
    "src/components/pages/bintang/BintangDashboardPage.tsx",
    "src/contexts/SemesterContext.tsx",
    "src/hooks/useDashboardData.ts",
]

for file_path in files_to_update:
    full_path = os.path.join(r"d:\coding\Guru Cerdas", file_path)
    if not os.path.exists(full_path):
        continue
        
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Make sure we don't double replace if we run it twice
    if "waka_kurikulum" in content:
        continue
        
    # Replace cases
    content = content.replace(
        "else if (userRole === 'waka_kesiswaan') roleLabel = 'Waka Kesiswaan';",
        "else if (userRole === 'waka_kesiswaan') roleLabel = 'Waka Kesiswaan';\n  else if (userRole === 'waka_kurikulum') roleLabel = 'Waka Kurikulum';"
    )
    
    content = content.replace(
        "'guru', 'wali_kelas', 'kepala_madrasah', 'waka_kesiswaan', 'admin'",
        "'guru', 'wali_kelas', 'kepala_madrasah', 'waka_kesiswaan', 'waka_kurikulum', 'admin'"
    )
    
    content = content.replace(
        "case 'waka_kesiswaan': return 'Waka Kesiswaan';",
        "case 'waka_kesiswaan': return 'Waka Kesiswaan';\n      case 'waka_kurikulum': return 'Waka Kurikulum';"
    )
    
    content = content.replace(
        "new Set(['kepala_madrasah', 'waka_kesiswaan']);",
        "new Set(['kepala_madrasah', 'waka_kesiswaan', 'waka_kurikulum']);"
    )
    
    content = content.replace(
        "userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'admin'",
        "userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum' || userRole === 'admin'"
    )
    
    content = content.replace(
        "userRole === 'waka_kesiswaan' || userRole === 'kepala_madrasah' || userRole === 'admin'",
        "userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum' || userRole === 'kepala_madrasah' || userRole === 'admin'"
    )
    
    content = content.replace(
        "userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan'",
        "userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum'"
    )
    
    content = content.replace(
        "userRole !== 'waka_kesiswaan' && userRole !== 'kepala_madrasah' && userRole !== 'admin'",
        "userRole !== 'waka_kesiswaan' && userRole !== 'waka_kurikulum' && userRole !== 'kepala_madrasah' && userRole !== 'admin'"
    )
    
    content = content.replace(
        "['admin', 'teacher', 'kepala_madrasah', 'waka_kesiswaan']",
        "['admin', 'teacher', 'kepala_madrasah', 'waka_kesiswaan', 'waka_kurikulum']"
    )
    
    content = content.replace(
        "waka_kesiswaan: 'Waka Kesiswaan',",
        "waka_kesiswaan: 'Waka Kesiswaan',\n    waka_kurikulum: 'Waka Kurikulum',"
    )
    
    content = content.replace(
        '<option value="waka_kesiswaan">Waka Kesiswaan</option>',
        '<option value="waka_kesiswaan">Waka Kesiswaan</option>\n                                    <option value="waka_kurikulum">Waka Kurikulum</option>'
    )
    
    content = content.replace(
        "isAdmin || isHomeroomTeacher || userRole === 'waka_kesiswaan' || userRole === 'kepala_madrasah'",
        "isAdmin || isHomeroomTeacher || userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum' || userRole === 'kepala_madrasah'"
    )
    
    content = content.replace(
        "userRole === 'admin' || userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan'",
        "userRole === 'admin' || userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan' || userRole === 'waka_kurikulum'"
    )

    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Replacement done.")
