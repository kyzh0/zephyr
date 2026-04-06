import { useQuery } from '@tanstack/react-query';
import { fetchRecognitionLeaderboard, listDonations } from '@/services/donation.service';
import type { IDonation } from '@/models/donation.model';

export function useLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchRecognitionLeaderboard
  });
}

interface UseDonationsResult {
  donations: IDonation[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDonations(): UseDonationsResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['donations'],
    queryFn: listDonations
  });

  return {
    donations: data ?? [],
    isLoading,
    error,
    refetch: async () => {
      await refetch();
    }
  };
}
