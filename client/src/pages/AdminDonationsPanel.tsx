import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

import { DONATION_REGIONS, type IDonation } from '@/models/donation.model';
import { createDonation, deleteDonation } from '@/services/donation.service';
import { useDonations } from '@/hooks';
import { ApiError } from '@/services/api-error';

const formSchema = z.object({
  donorName: z.string().min(1, 'Name is required'),
  amount: z.string().refine((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0;
  }, 'Enter a positive amount'),
  donatedAt: z.string().min(1, 'Date is required'),
  region: z.enum(DONATION_REGIONS)
});

type FormValues = z.infer<typeof formSchema>;

interface DonorGroup {
  key: string;
  displayName: string;
  items: IDonation[];
  totalAmount: number;
}

export function AdminDonationsPanel() {
  const { donations, isLoading, refetch } = useDonations();
  const [donationSearch, setDonationSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    if (!donationSearch.trim()) return donations;
    const q = donationSearch.toLowerCase().trim();
    return donations.filter((r) => {
      return r.donorName.toLowerCase().includes(q);
    });
  }, [donations, donationSearch]);

  const donorGroups = useMemo(() => {
    const map = new Map<string, DonorGroup>();
    for (const r of filteredRows) {
      const key = r.donorName.trim();
      if (!key) continue;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(r);
        existing.totalAmount += r.amount;
      } else {
        map.set(key, {
          key,
          displayName: r.donorName.trim(),
          items: [r],
          totalAmount: r.amount
        });
      }
    }
    for (const g of map.values()) {
      g.items.sort((a, b) => new Date(b.donatedAt).getTime() - new Date(a.donatedAt).getTime());
    }
    return [...map.values()].sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredRows]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      donorName: '',
      amount: '',
      donatedAt: new Date().toLocaleDateString('en-NZ'),
      region: 'Unknown'
    }
  });

  async function onAdd(values: FormValues) {
    try {
      await createDonation({
        donorName: values.donorName.trim(),
        amount: Number(values.amount),
        donatedAt: new Date(values.donatedAt + 'T12:00:00').toISOString(),
        region: values.region
      });
      toast.success('Donation added');
      form.reset({
        donorName: '',
        amount: '',
        donatedAt: new Date().toLocaleDateString('en-NZ'),
        region: 'Unknown'
      });
      await refetch();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Unknown error';
      toast.error('Failed to add donation: ' + msg);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteDonation(deleteId);
      setDeleteId(null);
      toast.success('Donation removed');
      await refetch();
    } catch (error) {
      const msg = error instanceof ApiError ? error.message : 'Unknown error';
      toast.error('Failed to delete donation: ' + msg);
    }
  }

  return (
    <>
      <div className="space-y-8 max-w-4xl">
        <section className="space-y-4">
          <h2 className="text-lg font-medium">Add donation</h2>
          <p className="text-sm text-muted-foreground">
            Use the same donor name each time to aggregate totals. The public donate dialog shows
            rankings by total given and donation count; amounts are not shown there.
          </p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onAdd)} className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="donorName"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Donor name</FormLabel>
                    <FormControl>
                      <Input placeholder="Name as shown on the board" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (NZD)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="donatedAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Region</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DONATION_REGIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:col-span-2">
                <Button type="submit" disabled={isLoading}>
                  Add donation
                </Button>
              </div>
            </form>
          </Form>
        </section>

        <section className="space-y-4">
          <h2 className="text-lg font-medium">Recorded donations</h2>
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search donations..."
              value={donationSearch}
              onChange={(e) => setDonationSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <p className="text-muted-foreground">
              <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
              Loading...
            </p>
          ) : donations.length === 0 ? (
            <p className="text-muted-foreground">No donations yet</p>
          ) : donorGroups.length === 0 ? (
            <p className="text-muted-foreground">No donations match your search</p>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground">Donations: {filteredRows.length}</p>
                <p className="text-sm text-muted-foreground">
                  Total:{' '}
                  {filteredRows
                    .reduce((sum, row) => sum + row.amount, 0)
                    .toLocaleString('en-NZ', { style: 'currency', currency: 'NZD' })}
                </p>
              </div>
              <div className="space-y-6">
                {donorGroups.map((group) => (
                  <div key={group.key} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/40 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-semibold">{group.displayName}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {group.items.length} donation{group.items.length === 1 ? '' : 's'} ·{' '}
                        {group.totalAmount.toLocaleString('en-NZ', {
                          style: 'currency',
                          currency: 'NZD'
                        })}{' '}
                        total
                      </span>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Amount (NZD)</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Region</TableHead>
                          <TableHead className="w-25" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.items.map((row) => (
                          <TableRow key={row._id}>
                            <TableCell className="tabular-nums font-medium">
                              {row.amount.toLocaleString('en-NZ', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2
                              })}
                            </TableCell>
                            <TableCell>{format(new Date(row.donatedAt), 'dd MMM yyyy')}</TableCell>
                            <TableCell>{row.region}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setDeleteId(row._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <AlertDialog open={deleteId !== null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this donation record?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the entry from the database. Leaderboard totals will update accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
