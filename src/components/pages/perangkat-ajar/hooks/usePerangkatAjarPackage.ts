import { useState, useMemo, useCallback } from 'react';
import type {
  KaldikWeek,
  ProtaItem,
  ProtaHeader,
  MatrixCell,
  DocumentIdentity,
  ProtaValidationResult,
} from '../../../../types/perangkatAjar';
import type { ProtaSummary } from '../../../../services/perangkatAjarService';
import { loadProta, loadPromes } from '../../../../services/perangkatAjarService';
import { calculateRme } from '../../../../utils/kaldikEngine';
import { validateProtaBalance } from '../../../../utils/protaEngine';
import { applyKaldikLocks } from '../../../../utils/promesEngine';
import type { PackageDocument } from '../../../../utils/perangkatAjarPackage';
import { useToast } from '../../../../hooks/useToast';
import type { HeaderFields } from '../types/perangkatAjarPageTypes';

interface UsePerangkatAjarPackageOptions {
  protaId: string;
  subject: string;
  gradeLevel: string;
  academicYear: string;
  effectiveIdentity: DocumentIdentity;
  currentHeader: HeaderFields;
  protaItems: ProtaItem[];
  protaValidation: ProtaValidationResult;
  weeks: KaldikWeek[];
  lockedPromesCellsSem1: MatrixCell[];
  lockedPromesCellsSem2: MatrixCell[];
  protaList: ProtaSummary[];
  flushPendingPromesSaves: () => void;
}

export function usePerangkatAjarPackage({
  protaId,
  subject,
  gradeLevel,
  academicYear,
  effectiveIdentity,
  currentHeader,
  protaItems,
  protaValidation,
  weeks,
  lockedPromesCellsSem1,
  lockedPromesCellsSem2,
  protaList,
  flushPendingPromesSaves,
}: UsePerangkatAjarPackageOptions) {
  const [isPackaging, setIsPackaging] = useState(false);
  const toast = useToast();

  const yearDocumentIds = useMemo(() => {
    const ids = protaList.filter((doc) => doc.academicYear === academicYear).map((doc) => doc.id);
    return ids.includes(protaId) || protaItems.length === 0 ? ids : [protaId, ...ids];
  }, [protaList, academicYear, protaId, protaItems.length]);

  const identityFor = useCallback(
    (h: Pick<ProtaHeader, 'subject' | 'gradeLevel' | 'phase' | 'curriculum' | 'academicYear'>): DocumentIdentity => ({
      ...effectiveIdentity,
      subject: h.subject,
      gradeLevel: h.gradeLevel,
      phase: h.phase ? `Fase ${h.phase}` : undefined,
      curriculum: h.curriculum,
      academicYear: h.academicYear,
    }),
    [effectiveIdentity]
  );

  const currentPackageDocument = useCallback((): PackageDocument => ({
    identity: identityFor(currentHeader),
    items: protaItems,
    validation: protaValidation,
    weeks,
    cellsSem1: lockedPromesCellsSem1,
    cellsSem2: lockedPromesCellsSem2,
  }), [identityFor, currentHeader, protaItems, protaValidation, weeks, lockedPromesCellsSem1, lockedPromesCellsSem2]);

  const loadPackageDocument = useCallback(
    async (id: string): Promise<PackageDocument | null> => {
      if (id === protaId) return currentPackageDocument();
      const { header, items } = await loadProta(id);
      if (!header) return null;
      const [promes1, promes2] = await Promise.all([loadPromes(id, 1), loadPromes(id, 2)]);
      const validation = validateProtaBalance(
        items,
        calculateRme(weeks, 1, header.weeklyJpQuota, header.reserveJpSem1),
        calculateRme(weeks, 2, header.weeklyJpQuota, header.reserveJpSem2)
      );
      return {
        identity: identityFor(header),
        items,
        validation,
        weeks,
        cellsSem1: applyKaldikLocks(promes1.cells, weeks, 1),
        cellsSem2: applyKaldikLocks(promes2.cells, weeks, 2),
      };
    },
    [protaId, currentPackageDocument, weeks, identityFor]
  );

  const handleDownloadPackage = useCallback(
    async (scope: 'current' | 'year') => {
      if (protaItems.length === 0 && scope === 'current') {
        toast.info('Dokumen ini belum berisi materi.');
        return;
      }
      flushPendingPromesSaves();
      setIsPackaging(true);
      try {
        const documents =
          scope === 'current'
            ? [currentPackageDocument()]
            : (await Promise.all(yearDocumentIds.map(loadPackageDocument))).filter(
                (doc): doc is PackageDocument => doc !== null && doc.items.length > 0
              );
        if (documents.length === 0) {
          toast.info('Belum ada Prota berisi materi untuk tahun ajaran ini.');
          return;
        }

        const { buildPerangkatAjarPackage, toSafeFileName } = await import(
          '../../../../utils/perangkatAjarPackage'
        );
        const blob = await buildPerangkatAjarPackage(documents);
        const fileName =
          scope === 'current'
            ? `Prota Promes ${subject} ${gradeLevel}.zip`
            : `Perangkat Ajar ${academicYear.replace('/', '-')}.zip`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = toSafeFileName(fileName);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          link.remove();
          URL.revokeObjectURL(url);
        }, 1500);
        toast.success(
          documents.length === 1
            ? 'Paket Prota & Promes diunduh.'
            : `Paket ${documents.length} Prota & Promes diunduh.`
        );
      } catch (err) {
        console.error('[PerangkatAjarPage] Package download failed:', err);
        toast.error('Gagal membuat paket. Coba lagi, atau unduh satu per satu di tab Pratinjau.');
      } finally {
        setIsPackaging(false);
      }
    },
    [
      protaItems.length,
      flushPendingPromesSaves,
      currentPackageDocument,
      yearDocumentIds,
      loadPackageDocument,
      subject,
      gradeLevel,
      academicYear,
      toast,
    ]
  );

  return {
    isPackaging,
    yearDocumentIds,
    handleDownloadPackage,
  };
}
