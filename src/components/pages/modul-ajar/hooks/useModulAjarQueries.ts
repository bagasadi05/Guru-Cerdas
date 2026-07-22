import { useQuery } from '@tanstack/react-query';
import { modulAjarContentService } from '../../../../services/modulAjarContentService';

export const useTopikRecommendations = (mapel: string) => {
  return useQuery({
    queryKey: ['modulAjarTopikRecommendations', mapel],
    queryFn: () => modulAjarContentService.getTopikRecommendations(mapel),
    enabled: !!mapel,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

export const useBoilerplateTopik = (mapel: string, topik: string, fase?: string) => {
  return useQuery({
    queryKey: ['modulAjarBoilerplate', mapel, topik, fase],
    queryFn: () => modulAjarContentService.getBoilerplate(mapel, topik, fase),
    enabled: !!mapel && !!topik,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

export const useSintaksKegiatan = (modelId: string, placeholders: { topik: string; mapel: string; kelas: string }) => {
  return useQuery({
    queryKey: ['modulAjarSintaks', modelId, placeholders],
    queryFn: () => modulAjarContentService.getSintaksKegiatan(modelId, placeholders),
    enabled: !!modelId,
    staleTime: 1000 * 60 * 60 * 24,
  });
};

export const useRubrikTemplates = (kategori: string) => {
  return useQuery({
    queryKey: ['modulAjarRubrik', kategori],
    queryFn: () => modulAjarContentService.getRubrikTemplates(kategori),
    enabled: !!kategori,
    staleTime: 1000 * 60 * 60 * 24,
  });
};

export const useTemaKbc = () => {
  return useQuery({
    queryKey: ['modulAjarTemaKbc'],
    queryFn: () => modulAjarContentService.getTemaKbc(),
    staleTime: 1000 * 60 * 60 * 24,
  });
};

export const useMateriInsersiMulti = (temaIds: string[]) => {
  return useQuery({
    queryKey: ['modulAjarMateriInsersi', temaIds],
    queryFn: async () => {
      const allMateri = await Promise.all(temaIds.map(id => modulAjarContentService.getMateriInsersi(id)));
      return allMateri.flat();
    },
    enabled: temaIds.length > 0,
    staleTime: 1000 * 60 * 60 * 24,
  });
};

export const useBankTp = (cpId: string) => {
  return useQuery({
    queryKey: ['modulAjarBankTp', cpId],
    queryFn: () => modulAjarContentService.getBankTp(cpId),
    enabled: !!cpId,
    staleTime: 1000 * 60 * 60 * 24,
  });
};
