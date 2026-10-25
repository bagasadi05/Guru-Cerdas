import React from 'react';
import {
  Archive,
  ArrowLeft,
  Lock,
  Search,
  Loader2,
  Printer,
  Award,
  Calendar,
  Sparkles,
  ShieldAlert,
  FileText,
  CheckCircle,
  Smile,
} from 'lucide-react';
import { Card, CardContent } from '../../../ui/Card';
import { MotionDiv } from '../../../ui/MotionComponents';
import { getStudentAvatar } from '../../../../utils/avatarUtils';
import {
  Student,
  ClassItem,
  StudentHistoryData,
  StudentStats,
} from '../types';

interface BrankasStudentDetailViewerProps {
  detailClass: ClassItem;
  academicYearLabel: string;
  onBack: () => void;
  studentSearchQuery: string;
  onStudentSearchChange: (value: string) => void;
  classStudents: Student[];
  displayedStudents: Student[];
  loadingStudents: boolean;
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  studentHistory: StudentHistoryData | null;
  loadingStudentHistory: boolean;
  studentStats: StudentStats | null;
}

export const BrankasStudentDetailViewer: React.FC<BrankasStudentDetailViewerProps> = ({
  detailClass,
  academicYearLabel,
  onBack,
  studentSearchQuery,
  onStudentSearchChange,
  classStudents,
  displayedStudents,
  loadingStudents,
  selectedStudent,
  onSelectStudent,
  studentHistory,
  loadingStudentHistory,
  studentStats,
}) => {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      <Card className="overflow-hidden shadow-md border-slate-200/60 dark:border-slate-700/50">
        {/* Detail Header */}
        <div className="p-5 sm:p-6 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/60 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
              aria-label="Kembali ke daftar kelas"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-emerald-500" />
                Arsip Kelas: {detailClass.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                Tahun Ajaran: {academicYearLabel} • {classStudents.length} Siswa
              </p>
            </div>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            Mode Kunci (Read-Only)
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[400px]">
          {/* Left Side: Students List */}
          <div className="border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-slate-700/50 p-4 sm:p-5 flex flex-col max-h-[50dvh] lg:max-h-[calc(100vh-280px)] bg-white dark:bg-slate-800">
            <div className="flex flex-col gap-2.5 mb-4">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">Daftar Siswa</h4>
              {classStudents.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={(e) => onStudentSearchChange(e.target.value)}
                    placeholder="Cari siswa..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
              {loadingStudents ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mx-auto" />
                </div>
              ) : classStudents.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic text-sm">Tidak ada siswa terdaftar.</div>
              ) : displayedStudents.length === 0 ? (
                <div className="py-20 text-center text-slate-400 italic text-xs">Siswa tidak ditemukan.</div>
              ) : (
                displayedStudents.map((student) => (
                  <button
                    type="button"
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-200 ${
                      selectedStudent?.id === student.id
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md scale-[1.02]'
                        : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 text-slate-800 dark:text-slate-300 hover:border-emerald-300 dark:hover:border-slate-700 hover:shadow-sm'
                    }`}
                  >
                    <img
                      src={getStudentAvatar(student.avatar_url, student.gender, student.id, student.name, 'sm')}
                      alt="Avatar"
                      className="w-10 h-10 rounded-xl object-cover border-2 border-white dark:border-white/10"
                    />
                    <div className="overflow-hidden flex-1">
                      <p className="font-bold text-sm truncate">{student.name}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xxs font-black ${
                        student.gender === 'Laki-laki'
                          ? selectedStudent?.id === student.id
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                          : selectedStudent?.id === student.id
                            ? 'bg-white/20 text-white'
                            : 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400'
                      }`}
                      aria-label={student.gender === 'Laki-laki' ? 'Laki-laki' : 'Perempuan'}
                    >
                      {student.gender === 'Laki-laki' ? 'L' : 'P'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right Side: Student History Viewer */}
          <div className="lg:col-span-2 p-4 sm:p-6 flex flex-col justify-between overflow-y-auto max-h-[60dvh] lg:max-h-[calc(100vh-280px)] custom-scrollbar bg-slate-50/30 dark:bg-slate-900/20">
            {selectedStudent ? (
              <div className="space-y-6 animate-fade-in">
                {/* Student Title */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <img
                      src={getStudentAvatar(selectedStudent.avatar_url, selectedStudent.gender, selectedStudent.id, selectedStudent.name, 'md')}
                      alt="Avatar"
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-200 dark:border-white/20 shadow-md"
                    />
                    <div>
                      <h4 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        {selectedStudent.name}
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                            selectedStudent.gender === 'Laki-laki'
                              ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                              : 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-400'
                          }`}
                        >
                          {selectedStudent.gender === 'Laki-laki' ? 'L' : 'P'}
                        </span>
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                        {detailClass.name.toLowerCase().startsWith('kelas') ? detailClass.name : `Kelas ${detailClass.name}`}
                      </p>
                    </div>
                  </div>
                  {/* Cetak Rapor Button */}
                  <a
                    href={`/cetak-rapot/${selectedStudent.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Rapor Lama
                  </a>
                </div>

                {loadingStudentHistory ? (
                  <div className="py-20 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                  </div>
                ) : studentStats ? (
                  <div className="space-y-6">
                    {/* Stats Mini Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200/50 dark:border-emerald-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                        <Award className="w-5 h-5 text-emerald-500 mb-1" />
                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{studentStats.avgScore}</span>
                        <span className="text-xxs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Rata-rata Nilai</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200/50 dark:border-blue-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                        <Calendar className="w-5 h-5 text-blue-500 mb-1" />
                        <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{studentStats.attendanceRate}%</span>
                        <span className="text-xxs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Kehadiran</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                        <Sparkles className="w-5 h-5 text-amber-500 mb-1" />
                        <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{studentStats.totalQuizPoints}</span>
                        <span className="text-xxs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Poin Keaktifan</span>
                      </div>

                      <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/5 border border-red-200/50 dark:border-red-500/10 flex flex-col items-center justify-center text-center shadow-sm">
                        <ShieldAlert className="w-5 h-5 text-red-500 mb-1" />
                        <span className="text-2xl font-black text-red-600 dark:text-red-400">{studentStats.totalViolations}</span>
                        <span className="text-xxs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">Poin Pelanggaran</span>
                      </div>
                    </div>

                    {/* Detail Data Lists */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Academics Record */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-1 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-emerald-500" />
                          Nilai Akademik
                        </h5>
                        {studentHistory?.academics.length === 0 ? (
                          <p className="text-xs italic text-slate-400 p-3 bg-slate-50 dark:bg-white/5 rounded-xl text-center">Tidak ada data nilai.</p>
                        ) : (
                          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-hide">
                            {studentHistory?.academics.map((record) => (
                              <div key={record.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm">
                                <div className="overflow-hidden">
                                  <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{record.subject}</p>
                                  <p className="text-xxs text-slate-400 font-semibold truncate mt-0.5">{record.assessment_name || 'Asesmen'}</p>
                                </div>
                                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-black rounded-lg border border-emerald-500/20">
                                  {record.score}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Attendance Details */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-white/5 pb-1 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          Rincian Kehadiran
                        </h5>
                        <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3.5 shadow-sm">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600 dark:text-slate-400">Total Hari Absen</span>
                            <span className="text-slate-800 dark:text-white">{studentStats.totalAttendance} Hari</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3.5">
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{studentStats.present}</p>
                              <p className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Hadir</p>
                            </div>
                            <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-center">
                              <p className="text-lg font-black text-sky-600 dark:text-sky-400">{studentStats.sakit}</p>
                              <p className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Sakit</p>
                            </div>
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                              <p className="text-lg font-black text-amber-600 dark:text-amber-400">{studentStats.izin}</p>
                              <p className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Izin</p>
                            </div>
                            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                              <p className="text-lg font-black text-rose-600 dark:text-rose-400">{studentStats.alpha}</p>
                              <p className="text-xxs font-bold text-slate-500 dark:text-slate-400 uppercase mt-0.5">Alpha</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Card className="h-full flex flex-col items-center justify-center text-center p-10 py-24 border-dashed border-slate-300/60 dark:border-slate-800/80">
                <CardContent className="flex flex-col items-center">
                  <Smile className="w-12 h-12 text-slate-400 dark:text-slate-600 mb-3" />
                  <h4 className="text-base font-bold text-slate-700 dark:text-slate-300">Pilih Siswa</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-500 max-w-xs mt-1">
                    Silakan pilih siswa dari daftar sebelah kiri untuk melihat rekam jejak nilai akademik dan riwayat kehadirannya secara mendetail.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </Card>
    </MotionDiv>
  );
};
