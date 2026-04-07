import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDonation,
  deleteDonation,
  fetchRecognitionLeaderboard,
  listDonations
} from '@/services/donation.service';
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
}

export function useDonations(): UseDonationsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['donations'],
    queryFn: listDonations
  });

  return {
    donations: data ?? [],
    isLoading,
    error
  };
}

export function useAddDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDonation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  });
}

export function useDeleteDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDonation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    }
  });
}
