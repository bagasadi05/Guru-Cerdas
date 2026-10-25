import React from 'react';
import {
  BookOpen,
  Calendar,
  Users,
  FolderLock,
  RotateCcw,
  Archive,
  Lock,
  Unlock,
} from 'lucide-react';
import { Button } from '../../../ui/Button';
import { CardInteractive, CardContent } from '../../../ui/Card';
import { ClassItem } from '../types';

interface BrankasClassCardProps {
  cls: ClassItem;
  studentCount: number;
  academicYearLabel: string;
  onOpenDetail: (cls: ClassItem) => void;
  onConfirmRestore: (cls: ClassItem) => void;
  onConfirmArchive: (cls: ClassItem) => void;
}

export const BrankasClassCard: React.FC<BrankasClassCardProps> = ({
  cls,
  studentCount,
  academicYearLabel,
  onOpenDetail,
  onConfirmRestore,
  onConfirmArchive,
}) => {
  return (
    <CardInteractive className="h-full flex flex-col justify-between group">
      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-emerald-50 dark:group-hover:bg-emerald-500/10 transition-colors duration-300">
            <BookOpen className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
          </div>
          {cls.is_archived ? (
            <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xxs font-bold rounded-lg border border-amber-200/60 dark:border-amber-500/20 uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Terarsip
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xxs font-bold rounded-lg border border-emerald-200/60 dark:border-emerald-500/20 uppercase tracking-wider flex items-center gap-1">
              <Unlock className="w-3 h-3" />
              Aktif
            </span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex flex-wrap items-center gap-2 mb-2">
          {cls.name.toLowerCase().startsWith('kelas') ? cls.name : `Kelas ${cls.name}`}
          {cls.grade_level && (
            <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded border border-slate-200 dark:border-slate-700">
              Tingkat {cls.grade_level}
            </span>
          )}
        </h3>

        <div className="flex flex-col gap-1.5 mt-auto text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>TA: {academicYearLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span>{studentCount} siswa</span>
          </div>
        </div>
      </CardContent>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 mt-2 flex flex-col gap-2">
        {cls.is_archived ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onOpenDetail(cls)}
              variant="outline"
              size="sm"
              className="flex-1 min-h-[44px] rounded-xl font-medium bg-white dark:bg-slate-800 cursor-pointer active:scale-95 transition-all duration-150"
            >
              <FolderLock className="w-4 h-4 mr-1.5" />
              Buka Arsip
            </Button>
            <Button
              onClick={() => onConfirmRestore(cls)}
              variant="outline"
              size="sm"
              className="w-11 h-11 min-h-[44px] min-w-[44px] p-0 flex items-center justify-center rounded-xl bg-white dark:bg-slate-800 cursor-pointer active:scale-90 transition-transform"
              title="Pulihkan Kelas ke Dashboard"
              aria-label="Pulihkan kelas ke dashboard"
            >
              <RotateCcw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => onConfirmArchive(cls)}
            variant="secondary"
            className="w-full min-h-[44px] rounded-xl font-medium cursor-pointer active:scale-95 transition-all duration-150"
          >
            <Archive className="w-4 h-4 mr-1.5" />
            Simpan di Brankas
          </Button>
        )}
      </div>
    </CardInteractive>
  );
};
