import { useState, useEffect, useCallback } from 'react';
import { listDonations } from '@/services/donation.service';
import type { IDonation } from '@/models/donation.model';

export function useDonations() {
  const [donations, setDonations] = useState<IDonation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDonations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDonations();
      setDonations(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  return { donations, loading, refetch: fetchDonations };
}
