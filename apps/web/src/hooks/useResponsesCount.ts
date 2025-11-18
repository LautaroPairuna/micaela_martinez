import { useQuery } from '@tanstack/react-query';

interface UseResponsesCountReturn {
  count: number;
  isLoading: boolean;
}

export function useResponsesCount(resenaId: string): UseResponsesCountReturn {
  const { data, isLoading } = useQuery<{ count: number }>({
    queryKey: ['responsesCount', resenaId],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/${resenaId}/responses/count`);
      if (!response.ok) {
        return { count: 0 };
      }
      return response.json() as Promise<{ count: number }>;
    },
    enabled: !!resenaId,
    staleTime: 30_000,
  });

  return { count: data?.count ?? 0, isLoading };
}