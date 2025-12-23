import React, { useMemo } from 'react';
import { StatCard } from '../pages/student/StatCard';
import { CheckCircleIcon, XCircleIcon, AlertCircleIcon, ShieldAlertIcon } from '../Icons';

type StudentStatsProps = {
    students: any[];
    activeClassId: string;
};

export const StudentStats: React.FC<StudentStatsProps> = ({ students, activeClassId }) => {
    const studentStats = useMemo(() => {
        const allInClass = students.filter(s => s.class_id === activeClassId);
        const maleCount = allInClass.filter(s => s.gender === 'Laki-laki').length;
        const femaleCount = allInClass.filter(s => s.gender === 'Perempuan').length;
        const hasCodeCount = allInClass.filter(s => !!s.access_code).length;
        return { total: allInClass.length, male: maleCount, female: femaleCount, hasCode: hasCodeCount };
    }, [students, activeClassId]);

    if (!activeClassId) return null;

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             {/* We can reuse StatCard or make a simpler one for the main page if needed. 
                 The original StudentsPage didn't have these prominent stats, but it's a good addition as per plan.
                 However, to strictly refactor first, I will just replicate what was there or what is useful.
                 Wait, the original code computed `studentStats` but didn't seem to render them prominently in the JSX shown in view_file.
                 It might be better to just keep the filters for now and add stats later if requested.
                 BUT, for a "Premium" feel, adding a small summary bar is good.
              */}
              {/* Let's stick to EXACT extraction first to minimize bugs. 
                  The original code calculated stats but didn't render them in the top section visibly in the snippet I saw?
                  Actually, let's look at lines 233-239. It calculates, but where is it used?
                  It seems unused in the rendered output view I saw, or maybe I missed it.
                  Let's check the file content again or just skip rendering if it wasn't there.
                  
                  Actually, looking closely at the `view_file` output (lines 618-622):
                  It shows "Menampilkan X siswa".
                  
                  I'll hold off on a visual Stats component unless I see it in the UI.
                  Re-reading the `StudentsPage` code... `studentStats` is defined but unused?
                  Ah, okay. I will create the file but maybe not use it yet, or just skip it.
                  
                  Let's focus on `StudentGrid.tsx` and `StudentTable.tsx` which are definitely there.
              */}
        </div>
    );
};
