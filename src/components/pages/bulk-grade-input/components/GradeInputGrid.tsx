import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../ui/Card';
import { Input } from '../../../ui/Input';
import { EmptyState } from '../../../ui/EmptyState';
import { Skeleton } from '../../../ui/Skeleton';
import { VirtualList } from '../../../ui/VirtualList';
import { SearchIcon, CheckCircleIcon } from '../../../Icons';

interface GradeEntry {
    studentId: string;
    studentName: string;
    score: number | '';
}

interface GradeInputGridProps {
    grades: GradeEntry[];
    filteredGrades: GradeEntry[];
    searchTerm: string;
    setSearchTerm: (v: string) => void;
    loadingStudents: boolean;
    filledCount: number;
    renderStudentRow: (g: GradeEntry, index: number) => React.ReactNode;
}

const VIRTUALIZATION_THRESHOLD = 30;

export const GradeInputGrid: React.FC<GradeInputGridProps> = ({
    grades,
    filteredGrades,
    searchTerm,
    setSearchTerm,
    loadingStudents,
    filledCount,
    renderStudentRow,
}) => {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Daftar Siswa ({grades.length})</CardTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    {filledCount} / {grades.length} terisi
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Search bar */}
                <div className="relative group">
                    <SearchIcon className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2 transition-colors group-focus-within:text-indigo-500" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Cari nama siswa..."
                        className="pl-10 w-full"
                    />
                </div>

                {loadingStudents ? (
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map(i => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : grades.length === 0 ? (
                    <EmptyState
                        icon={<SearchIcon />}
                        title="Tidak Ada Siswa"
                        description="Belum ada data siswa untuk kelas ini."
                        className="py-12"
                    />
                ) : filteredGrades.length === 0 ? (
                    <EmptyState
                        icon={<SearchIcon />}
                        title="Siswa Tidak Ditemukan"
                        description={`Tidak ada hasil untuk pencarian "${searchTerm}"`}
                        className="py-12"
                    />
                ) : filteredGrades.length > VIRTUALIZATION_THRESHOLD ? (
                    // Use virtualization for large lists
                    <VirtualList
                        items={filteredGrades}
                        itemHeight={64}
                        containerHeight={500}
                        renderItem={(g, index) => renderStudentRow(g, index)}
                        keyExtractor={(g) => g.studentId}
                    />
                ) : (
                    // Regular render for small lists
                    <div className="space-y-2">
                        {filteredGrades.map((g, index) => renderStudentRow(g, index))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
