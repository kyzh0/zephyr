import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDonation,
  deleteDonation,
  fetchRecognitionLeaderboard,
  listDonations
} from '@/services/donation.service';
import type { IDonation } from '@/models/donation.model';

export const donationKeys = {
  all: ['donations'] as const,
  leaderboard: ['donations', 'leaderboard'] as const
};

export function useLeaderboard() {
  return useQuery({
    queryKey: donationKeys.leaderboard,
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
    queryKey: donationKeys.all,
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
      queryClient.invalidateQueries({ queryKey: donationKeys.all });
    }
  });
}

export function useDeleteDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteDonation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donationKeys.all });
    }
  });
}
