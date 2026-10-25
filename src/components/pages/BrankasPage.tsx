import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  useBrankasData,
  BrankasHeader,
  BrankasClassGrid,
  BrankasStudentDetailViewer,
  BrankasModals,
} from './brankas';

const BrankasPage: React.FC = () => {
  const {
    activeTab,
    searchQuery,
    setSearchQuery,
    confirmArchiveClass,
    setConfirmArchiveClass,
    confirmRestoreClass,
    setConfirmRestoreClass,
    confirmText,
    setConfirmText,
    detailClass,
    setDetailClass,
    selectedStudent,
    setSelectedStudent,
    studentSearchQuery,
    setStudentSearchQuery,
    loadingClasses,
    studentCountMap,
    activeClasses,
    archivedClasses,
    totalArchivedStudents,
    displayedClasses,
    handleTabSwitch,
    classStudents,
    loadingStudents,
    displayedStudents,
    studentHistory,
    loadingStudentHistory,
    studentStats,
    archiveMutation,
    restoreMutation,
    handleArchive,
    handleRestore,
    getAcademicYearLabel,
  } = useBrankasData();

  if (loadingClasses) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-950/20">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
          <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Memuat Brankas Kelas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full pb-20 lg:pb-6 font-sans">
      {/* Header Panel */}
      <BrankasHeader
        activeCount={activeClasses.length}
        archivedCount={archivedClasses.length}
        totalArchivedStudents={totalArchivedStudents}
      />

      {/* Main Content: Either Detail Mode (Historical Student Viewer) or Class Grid */}
      {detailClass ? (
        <BrankasStudentDetailViewer
          detailClass={detailClass}
          academicYearLabel={getAcademicYearLabel(detailClass)}
          onBack={() => {
            setDetailClass(null);
            setSelectedStudent(null);
            setStudentSearchQuery('');
          }}
          studentSearchQuery={studentSearchQuery}
          onStudentSearchChange={setStudentSearchQuery}
          classStudents={classStudents}
          displayedStudents={displayedStudents}
          loadingStudents={loadingStudents}
          selectedStudent={selectedStudent}
          onSelectStudent={setSelectedStudent}
          studentHistory={studentHistory ?? null}
          loadingStudentHistory={loadingStudentHistory}
          studentStats={studentStats}
        />
      ) : (
        <BrankasClassGrid
          activeTab={activeTab}
          onTabSwitch={handleTabSwitch}
          activeCount={activeClasses.length}
          archivedCount={archivedClasses.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          displayedClasses={displayedClasses}
          studentCountMap={studentCountMap}
          getAcademicYearLabel={getAcademicYearLabel}
          onOpenDetail={(cls) => {
            setDetailClass(cls);
            setStudentSearchQuery('');
          }}
          onConfirmRestore={setConfirmRestoreClass}
          onConfirmArchive={setConfirmArchiveClass}
        />
      )}

      {/* Confirmation Modals for Archive and Restore */}
      <BrankasModals
        confirmArchiveClass={confirmArchiveClass}
        onCloseArchiveModal={() => {
          setConfirmArchiveClass(null);
          setConfirmText('');
        }}
        confirmText={confirmText}
        onConfirmTextChange={setConfirmText}
        onArchive={handleArchive}
        isArchivePending={archiveMutation.isPending}
        confirmRestoreClass={confirmRestoreClass}
        onCloseRestoreModal={() => setConfirmRestoreClass(null)}
        onRestore={handleRestore}
        isRestorePending={restoreMutation.isPending}
      />
    </div>
  );
};

export default BrankasPage;
