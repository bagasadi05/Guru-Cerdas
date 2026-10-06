import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../../services/supabase';

/** A saved lesson plan as listed in Riwayat; the HTML is loaded on demand. */
export interface LessonPlanListItem {
  id: string;
  user_id: string;
  document_type: string | null;
  curriculum_approach: string | null;
  generation_method: string | null;
  identity: any;
  components: any;
  created_at: string;
  updated_at: string | null;
  generated_content?: string | null;
}

/** Listing every document's HTML cost ~1.4 MB for a teacher with 27 plans. */
const HISTORY_COLUMNS =
  'id, user_id, document_type, curriculum_approach, generation_method, identity, components, created_at, updated_at';

const newestFirst = (a: LessonPlanListItem, b: LessonPlanListItem) =>
  b.created_at.localeCompare(a.created_at);

export function useModulAjarHistory(userId: string | undefined) {
  const [history, setHistory] = useState<LessonPlanListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('lesson_plans')
        .select(HISTORY_COLUMNS)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (queryError) {
        console.error('Failed to load history:', queryError);
        setError(`Gagal memuat riwayat: ${queryError.message}`);
        setHistory([]);
      } else {
        setHistory((data || []) as LessonPlanListItem[]);
        setError(null);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
      setError('Gagal memuat riwayat. Periksa koneksi lalu coba lagi.');
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /** One document's HTML, or null when it could not be loaded. */
  const loadPlanContent = useCallback(
    async (plan: { id: string; generated_content?: string | null }): Promise<string | null> => {
      if (plan.generated_content) return plan.generated_content;
      const { data, error: queryError } = await supabase
        .from('lesson_plans')
        .select('generated_content')
        .eq('id', plan.id)
        .single();
      if (queryError || !data?.generated_content) return null;
      return data.generated_content as string;
    },
    [],
  );

  /** Moves a document out of Riwayat. It stays restorable through undoDelete. */
  const softDelete = useCallback(async (id: string): Promise<LessonPlanListItem | null> => {
    const removed = historyRef.current.find((item) => item.id === id) ?? null;
    const { error: updateError } = await supabase
      .from('lesson_plans')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (updateError) throw updateError;
    setHistory((prev) => prev.filter((item) => item.id !== id));
    return removed;
  }, []);

  const undoDelete = useCallback(async (item: LessonPlanListItem) => {
    const { error: updateError } = await supabase
      .from('lesson_plans')
      .update({ deleted_at: null })
      .eq('id', item.id);
    if (updateError) throw updateError;
    setHistory((prev) => [...prev.filter((p) => p.id !== item.id), item].sort(newestFirst));
  }, []);

  /** Keeps the listed copy in step after the document was changed elsewhere. */
  const updateLocal = useCallback((id: string, patch: Partial<LessonPlanListItem>) => {
    setHistory((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  return { history, isLoading, error, fetchHistory, loadPlanContent, softDelete, undoDelete, updateLocal };
}
