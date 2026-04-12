import type { Donation, LeaderboardResponse } from '@/models/donation.model';
import { getKeyQueryThrowIfInvalid, throwIfNotOk } from './api-error';

export async function fetchRecognitionLeaderboard(): Promise<LeaderboardResponse> {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/donations/leaderboard`);
  await throwIfNotOk(res);
  return res.json() as Promise<LeaderboardResponse>;
}

export async function listDonations(): Promise<Donation[]> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/donations?${getKeyQueryThrowIfInvalid()}`
  );
  await throwIfNotOk(res);
  return res.json() as Promise<Donation[]>;
}

export async function createDonation(body: {
  donorName: string;
  amount: number;
  donatedAt: string;
  region: string;
}): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/donations?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
  await throwIfNotOk(res);
}

export async function deleteDonation(id: string): Promise<void> {
  const res = await fetch(
    `${import.meta.env.VITE_API_PREFIX}/donations/${id}?${getKeyQueryThrowIfInvalid()}`,
    {
      method: 'DELETE'
    }
  );
  await throwIfNotOk(res);
}
