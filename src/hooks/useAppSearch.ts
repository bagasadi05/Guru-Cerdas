import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { globalSearch, type SearchEntityType } from '../services/SearchService';
import type { SearchResult } from '../components/searchTypes';
import { logger } from '../services/logger';

/**
 * Provides global search functionality with result navigation.
 * Extracted from AppContent to keep it focused and testable.
 */
export function useAppSearch() {
  const navigate = useNavigate();
  const { session } = useAuth();

  const userId = session?.user?.id;

  const handleSearch = useCallback(async (query: string, type: string): Promise<SearchResult[]> => {
    if (!userId || !query || query.length < 2) return [];

    const entityType = (type === 'schedule' ? 'schedules' : type) as SearchEntityType;

    try {
      const serviceResults = await globalSearch(userId, query, { entityType, limit: 10 });

      return serviceResults.map(r => ({
        id: r.id,
        type: (r.type === 'schedules' ? 'schedule' : r.type) as SearchResult['type'],
        title: r.title,
        subtitle: r.subtitle,
        metadata: r.metadata,
        relevance: r.relevance,
      }));
    } catch (error) {
      logger.error('Search error', error as Error, undefined, 'Search');
      return [];
    }
  }, [userId]);

  const handleSearchResult = useCallback((result: { id: string; type: string }) => {
    switch (result.type) {
      case 'students':
        navigate(`/siswa/${result.id}`);
        break;
      case 'classes':
        navigate('/siswa');
        break;
      case 'schedule':
        navigate('/jadwal');
        break;
      case 'attendance':
        navigate('/absensi');
        break;
      default:
        navigate('/dashboard');
    }
  }, [navigate]);

  return { handleSearch, handleSearchResult };
}
