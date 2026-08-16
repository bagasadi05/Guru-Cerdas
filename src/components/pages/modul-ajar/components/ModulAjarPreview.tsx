import React from 'react';
import { MotionDiv } from '../../../ui/MotionComponents';
import { BookOpen, Edit3 } from 'lucide-react';
import { useTranslation } from '../../../../utils/i18n';
import { sanitizeContent } from '../../../../services/securityEnhanced';

interface ModulAjarPreviewProps {
  generatedDocument: string;
  previewRef: React.RefObject<HTMLDivElement>;
  documentType: string;
  zoomLevel?: number;
  paperSize?: 'A4' | 'F4';
}

export const ModulAjarPreview: React.FC<ModulAjarPreviewProps> = ({
  generatedDocument,
  previewRef,
  documentType,
  zoomLevel = 100,
  paperSize = 'A4',
}) => {
  const { t } = useTranslation();

  return (
    <>
      {generatedDocument ? (
        <MotionDiv
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl min-h-full flex flex-col items-center"
        >
          {/* Subtle Live Edit Indicator Bar */}
          <div className="w-full max-w-[850px] mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs">
            <span className="flex items-center gap-1.5 font-medium text-brand-700 dark:text-brand-300">
              <Edit3 className="w-3.5 h-3.5 text-brand-500" />
              Mode Editor Aktif: Klik teks langsung di bawah untuk mengedit sebelum cetak / ekspor
            </span>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-bold text-slate-600 dark:text-slate-300">
                {paperSize === 'F4' ? 'Kertas: F4 / Folio' : 'Kertas: A4'}
              </span>
              <span>Skala: {zoomLevel}%</span>
            </div>
          </div>

          {/* Scalable A4 Document Paper Container */}
          <div
            className="w-full transition-transform duration-200 ease-out origin-top flex justify-center"
            style={{
              transform: `scale(${zoomLevel / 100})`,
              marginBottom: zoomLevel > 100 ? `${(zoomLevel - 100) * 8}px` : undefined,
            }}
          >
            <div
              ref={previewRef}
              className="bg-white p-8 sm:p-12 md:p-14 lg:p-16 shadow-2xl rounded-xl border border-slate-300/80 dark:border-slate-800 w-full max-w-[850px] text-black focus:outline-none focus:ring-2 focus:ring-brand-400/40 ring-offset-2 transition-all min-h-[900px]"
              style={{
                fontFamily: "'Times New Roman', Times, serif",
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08), 0 1px 8px rgba(0, 0, 0, 0.04)',
              }}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: sanitizeContent(generatedDocument) }}
            />
          </div>
        </MotionDiv>
      ) : (
        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl min-h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8 text-center space-y-4">
          <div className="w-20 h-20 bg-brand-50 dark:bg-brand-950/40 rounded-full flex items-center justify-center mb-1 animate-pulse">
            <BookOpen className="w-9 h-9 text-brand-500" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
              {t.lessonPlan.previewEmpty}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Lengkapi formulir di samping kiri lalu klik tombol <strong className="text-brand-600 dark:text-brand-400">"{t.lessonPlan.create.replace('{type}', documentType)}"</strong> untuk menyusun modul ajar standar Kurikulum Merdeka secara otomatis.
            </p>
          </div>
        </div>
      )}
    </>
  );
};
