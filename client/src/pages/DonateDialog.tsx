import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Loader2, Medal } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { fetchRecognitionLeaderboard } from '@/services/donation.service';
import type { LeaderboardDonorRow, LeaderboardRegionRow } from '@/models/donation.model';

function PlaceMedal({ rank }: { rank: number }) {
  if (rank > 2) return null;
  const cls =
    rank === 0
      ? 'text-amber-500'
      : rank === 1
        ? 'text-slate-400'
        : 'text-amber-800 dark:text-amber-600';
  const label = rank === 0 ? '1st place' : rank === 1 ? '2nd place' : '3rd place';
  return <Medal className={`inline h-4 w-4 shrink-0 ${cls}`} strokeWidth={2} aria-label={label} />;
}

export default function DonateDialog() {
  const navigate = useNavigate();

  const bankAccount = (import.meta.env.VITE_DONATION_BANK_ACCOUNT ?? '') as string;

  const [boardLoading, setBoardLoading] = useState(false);
  const [donors, setDonors] = useState<LeaderboardDonorRow[]>([]);
  const [regions, setRegions] = useState<LeaderboardRegionRow[]>([]);
  const [boardError, setBoardError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBoardLoading(true);
      setBoardError(null);
      const data = await fetchRecognitionLeaderboard();
      if (cancelled) return;
      if (!data) {
        setBoardError('Could not load recognition boards.');
        setDonors([]);
        setRegions([]);
      } else {
        setDonors(data.donors);
        setRegions(data.regions);
      }
      setBoardLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleCopy = async () => {
    if (bankAccount) {
      await navigator.clipboard.writeText(bankAccount);
      toast.success('Bank account copied to clipboard');
    }
  };

  return (
    <Dialog open onOpenChange={() => navigate('/')}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto text-center">
        <DialogHeader className="text-center sm:text-center space-y-0">
          <DialogTitle className="text-xl text-center w-full pr-6">Donate</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 text-center items-center">
          {/* hide focus on load */}
          <Button
            style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
            aria-hidden
            tabIndex={0}
          />
          <DialogDescription className="text-center">
            Zephyr will always be free and available for the New Zealand free-flying community.
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            However, any donations are appreciated and will go towards ongoing website costs and
            maintenance.
          </p>
          <p className="text-sm text-muted-foreground">
            You can make a contribution to the following bank account, with your name as the
            reference:
          </p>
          <p className="text-base font-medium w-full">Zephyr</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-base font-medium">{bankAccount}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground w-full">
            Huge thanks to our amazing supporters!
          </p>

          {boardLoading ? (
            <div className="flex justify-center py-8 w-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : boardError ? (
            <p className="text-sm text-destructive text-center w-full">{boardError}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-2 w-full">
              <section className="space-y-2 w-full">
                <h3 className="text-sm font-semibold text-center">Top Supporters</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableBody>
                      {donors.length === 0 ? (
                        <TableRow>
                          <TableCell className="text-muted-foreground text-center">
                            No entries yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        donors.map((row, i) => (
                          <TableRow key={row.name}>
                            <TableCell className="font-medium text-center">
                              <span className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                                {i < 3 ? <PlaceMedal rank={i} /> : null}
                                {row.name}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>

              <section className="space-y-2 w-full">
                <h3 className="text-sm font-semibold text-center">Top Supporting Regions</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-center" />
                        <TableHead className="text-center w-25">Donations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={2} className="text-muted-foreground text-center">
                            No entries yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        regions.map((row, i) => (
                          <TableRow key={row.name}>
                            <TableCell className="font-medium text-center">
                              <span className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                                {i < 3 ? <PlaceMedal rank={i} /> : null}
                                {row.name}
                              </span>
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {row.donationCount}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
