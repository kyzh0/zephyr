import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface DonateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DonateDialog({ open, onOpenChange }: DonateDialogProps) {
  const bankAccount = (import.meta.env.VITE_DONATION_BANK_ACCOUNT ??
    '00-0000-000000-000') as string;

  const handleCopy = async () => {
    if (bankAccount) {
      await navigator.clipboard.writeText(bankAccount);
      toast.success('Bank account copied to clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl">Donate</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-3 text-center">
          <DialogDescription>
            Zephyr will always be free and available for the New Zealand free-flying community.
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            However, any donations are appreciated and will go towards ongoing website costs and
            maintenance.
          </p>
          <p className="text-sm text-muted-foreground">
            If you like, you can make a contribution to the following bank account:
          </p>
          <p className="text-base font-medium mt-2">Zephyr</p>
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">{bankAccount}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
