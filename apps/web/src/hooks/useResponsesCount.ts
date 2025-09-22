import { useState, useEffect } from 'react';

interface UseResponsesCountReturn {
  count: number;
  isLoading: boolean;
}

export function useResponsesCount(resenaId: string): UseResponsesCountReturn {
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/reviews/${resenaId}/responses/count`);
        
        if (response.ok) {
          const data = await response.json();
          setCount(data.count || 0);
        } else {
          setCount(0);
        }
      } catch (error) {
        console.error('Error fetching responses count:', error);
        setCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    if (resenaId) {
      fetchCount();
    }
  }, [resenaId]);

  return { count, isLoading };
}