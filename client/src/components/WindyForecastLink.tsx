import { ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';

export function WindyForecastLink({
  coordinates,
  variant
}: {
  coordinates: [number, number];
  variant: 'link' | 'button';
}) {
  const [longitude, latitude] = coordinates;

  if (coordinates?.length !== 2) {
    return null;
  }

  return variant === 'button' ? (
    <Button asChild variant="outline" className="w-full">
      <a
        href={`https://www.windy.com/${latitude}/${longitude}/wind`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink data-icon="inline-start" />
        View forecast on Windy
      </a>
    </Button>
  ) : (
    <a
      href={`https://www.windy.com/${latitude}/${longitude}/wind`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs sm:text-sm text-muted-foreground hover:underline"
    >
      View forecast on Windy
    </a>
  );
}
