import type { IDonation, LeaderboardResponse } from '@/models/donation.model';

export async function fetchRecognitionLeaderboard(): Promise<LeaderboardResponse | null> {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/donations/leaderboard`);
  if (!res.ok) return null;
  return res.json() as Promise<LeaderboardResponse>;
}

function keyQuery(): string {
  const key = sessionStorage.getItem('adminKey');
  if (!key) throw new Error('Not signed in');
  return `key=${encodeURIComponent(key)}`;
}

export async function listDonations(): Promise<IDonation[]> {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/donations?${keyQuery()}`);
  if (res.status === 401 || !res.ok) return [];
  return res.json() as Promise<IDonation[]>;
}

export async function createDonation(body: {
  donorName: string;
  amount: number;
  donatedAt: string;
  region: string;
}): Promise<boolean> {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/donations?${keyQuery()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.ok;
}

export async function deleteDonation(id: string): Promise<boolean> {
  const res = await fetch(`${import.meta.env.VITE_API_PREFIX}/donations/${id}?${keyQuery()}`, {
    method: 'DELETE'
  });
  return res.ok;
}
