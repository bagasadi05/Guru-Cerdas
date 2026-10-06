import React from 'react';
import { BookOpen, Copy, FileText, FileDown, History, Maximize2, Printer } from 'lucide-react';
import { DownloadMenu, type DownloadMenuItem } from './DownloadMenu';

export type WorkspaceTab = 'preview' | 'history';

interface ModulAjarToolbarProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
  historyCount: number;
  hasDocument: boolean;
  /** Format currently being generated for the preview document, if any. */
  busyFormat: 'pdf' | 'docx' | null;
  onExportPdf: () => void;
  onExportWord: () => void;
  onPrint: () => void;
  onCopy: () => void;
  onFullscreen: () => void;
  /** `.doc` while the legacy browser export is active, `.docx` once the server export is on. */
  wordExtension: 'doc' | 'docx';
  labels: { preview: string; history: string; copy: string; pdf: string; word: string; print: string };
}

const TAB_BASE =
  'px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 duration-150 whitespace-nowrap';
const ICON_BUTTON =
  'w-9 h-9 hidden sm:flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 hover:text-brand-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-95 duration-150 shrink-0 border border-slate-200 dark:border-slate-700';

/**
 * Workspace header: tabs on the left, one primary "Unduh" menu on the right.
 * On phones copy and full screen move into the menu so nothing is clipped.
 */
export const ModulAjarToolbar: React.FC<ModulAjarToolbarProps> = ({
  activeTab,
  onTabChange,
  historyCount,
  hasDocument,
  busyFormat,
  onExportPdf,
  onExportWord,
  onPrint,
  onCopy,
  onFullscreen,
  wordExtension,
  labels,
}) => {
  const items: DownloadMenuItem[] = [
    {
      id: 'pdf',
      label: labels.pdf,
      description: 'Siap cetak, tata letak A4/F4 tetap',
      icon: FileDown,
      onSelect: onExportPdf,
    },
    {
      id: 'word',
      label: labels.word,
      description:
        wordExtension === 'docx' ? 'Berkas .docx, bisa diedit di Word' : 'Berkas .doc, bisa diedit di Word',
      icon: FileText,
      onSelect: onExportWord,
    },
    {
      id: 'print',
      label: labels.print,
      description: 'Buka dialog printer',
      icon: Printer,
      onSelect: onPrint,
    },
    {
      id: 'copy',
      label: labels.copy,
      icon: Copy,
      onSelect: onCopy,
      mobileOnly: true,
      separatorBefore: true,
    },
    {
      id: 'fullscreen',
      label: 'Layar penuh',
      icon: Maximize2,
      onSelect: onFullscreen,
      mobileOnly: true,
    },
  ];

  const tabClass = (tab: WorkspaceTab) =>
    `${TAB_BASE} ${
      activeTab === tab
        ? 'bg-white text-slate-800 dark:bg-slate-900 dark:text-white shadow-xs'
        : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
    }`;

  return (
    <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-4 shrink-0 shadow-xs z-20 gap-2">
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'preview'}
          onClick={() => onTabChange('preview')}
          className={tabClass('preview')}
        >
          <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{labels.preview}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => onTabChange('history')}
          className={tabClass('history')}
        >
          <History className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden md:inline">{labels.history}</span>
          <span className="md:hidden">Riwayat</span>
          {historyCount > 0 && (
            <span className="px-1.5 bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-300 rounded-full text-xxs font-bold">
              {historyCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'preview' && (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onCopy}
            disabled={!hasDocument}
            className={ICON_BUTTON}
            title={labels.copy}
            aria-label={labels.copy}
          >
            <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>
          <DownloadMenu items={items} disabled={!hasDocument} busy={busyFormat !== null} />
          {hasDocument && (
            <button
              type="button"
              onClick={onFullscreen}
              className={ICON_BUTTON}
              title="Mode layar penuh"
              aria-label="Mode layar penuh"
            >
              <Maximize2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
