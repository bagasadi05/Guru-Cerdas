import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

interface ModulAjarPreviewProps {
  generatedDocument: string;
  previewRef: React.RefObject<HTMLDivElement>;
  documentType: string;
}

export const ModulAjarPreview: React.FC<ModulAjarPreviewProps> = ({
  generatedDocument,
  previewRef,
  documentType
}) => {
  return (
    <>
      {generatedDocument ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          ref={previewRef}
          className="w-full max-w-4xl bg-white p-8 md:p-12 lg:p-16 shadow-xl rounded-lg border border-slate-200 dark:border-slate-800 min-h-full text-black focus:outline-none"
          style={{
            fontFamily: "'Times New Roman', Times, serif"
          }}
          contentEditable
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: generatedDocument }}
        />
      ) : (
        <div className="w-full max-w-4xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-lg min-h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 text-center space-y-4">
          <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-2 animate-pulse">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">Siap Membuat Dokumen</h3>
          <p className="text-sm max-w-sm">
            Isi parameter di sebelah kiri lalu klik tombol <strong>Buat {documentType}</strong> pada langkah ke-5.
          </p>
        </div>
      )}
    </>
  );
};
