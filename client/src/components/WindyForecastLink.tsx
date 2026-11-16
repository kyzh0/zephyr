import { ChevronRightIcon, ExternalLink } from 'lucide-react';

import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from '@/components/ui/item';

export function WindyForecastLink({
  coordinates,
  variant
}: {
  coordinates: [number, number];
  variant: 'link' | 'item';
}) {
  const [longitude, latitude] = coordinates;

  if (coordinates?.length !== 2) {
    return null;
  }

  return variant === 'item' ? (
    <Item asChild variant="outline" size="sm" className="w-full py-2">
      <a
        href={`https://www.windy.com/${latitude}/${longitude}/wind`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ItemMedia>
          <ExternalLink className="h-4 w-4" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>View forecast on Windy</ItemTitle>
        </ItemContent>
        <ItemActions>
          <ChevronRightIcon className="size-4" />
        </ItemActions>
      </a>
    </Item>
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
