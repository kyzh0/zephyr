import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatInTimeZone } from 'date-fns-tz';

import SEO from '@/components/SEO';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { ImageCarousel } from '@/components/ui/image-carousel';
import { Skeleton } from '@/components/ui/skeleton';

import { ApiError } from '@/services/api-error';
import { useSounding, useIsMobile } from '@/hooks';

export default function Sounding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sounding, error } = useSounding(id);
  const isMobile = useIsMobile();

  // Navigate back if sounding not found
  useEffect(() => {
    if (error instanceof ApiError && error.status === 404) navigate('/', { replace: true });
  }, [error, navigate]);

  const images = useMemo(() => {
    if (!sounding?.images?.length) return [];
    return [...sounding.images].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  }, [sounding]);

  // Computed once when images first arrives. Null until known so we defer
  // mounting the carousel — the carousel captures initialIndex at mount and
  // ignores subsequent changes, which is what preserves user position when
  // TanStack Query refetches and appends new images.
  const [initialIndex, setInitialIndex] = useState<number | null>(null);
  useEffect(() => {
    if (initialIndex !== null || !images.length) return;
    const future = images.findIndex(
      (img) => new Date(img.time).getTime() > Date.now() - 1800000 // 30 min
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInitialIndex(future >= 0 ? future : images.length - 1);
  }, [images, initialIndex]);

  const raspLink = sounding
    ? `http://rasp.nz/rasp/view.php?region=${sounding.raspRegion}&mod=%2B0&date=${formatInTimeZone(
        images[0]?.time ? new Date(images[0].time) : new Date(),
        'Pacific/Auckland',
        'yyyyMMdd'
      )}&all=sounding${sounding.raspId}&section=${sounding.raspRegion}.sounding.params`
    : '';

  return (
    <Dialog open onOpenChange={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
      {sounding && (
        <SEO
          title={`${sounding.name} Sounding`}
          description={`Atmospheric sounding forecast for ${sounding.name}. View predicted thermal and wind conditions for paragliding and hang gliding in New Zealand.`}
          path={`/soundings/${id}`}
        />
      )}
      <DialogContent
        className="portrait:w-[95vw] landscape:w-fit max-w-[95vw] max-h-[95vh] p-4 sm:p-6 gap-2 flex flex-col focus:outline-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-base sm:text-lg">
            {sounding?.name ?? <Skeleton className="h-6 sm:h-7 w-36 sm:w-44 mx-auto" />}
          </DialogTitle>
          <DialogDescription className="sr-only">Atmospheric sounding charts.</DialogDescription>
        </DialogHeader>

        {!sounding ? (
          <Skeleton className="landscape:h-[75vh] portrait:w-[80vw] aspect-3/4" />
        ) : !images.length ? (
          <p className="text-destructive">Error retrieving today's soundings.</p>
        ) : initialIndex === null ? (
          <Skeleton className="landscape:h-[75vh] portrait:w-[80vw] aspect-3/4" />
        ) : (
          <ImageCarousel
            images={images.map((img) => ({
              url: `${import.meta.env.VITE_FILE_SERVER_PREFIX}/${img.url}`,
              label: formatInTimeZone(new Date(img.time), 'Pacific/Auckland', 'dd MMM HH:mm')
            }))}
            initialIndex={initialIndex}
            fit="intrinsic"
            showArrows={!isMobile}
            showSlider
            alt={sounding.name}
          />
        )}

        {sounding && (
          <div className="flex items-center justify-end">
            <a
              href={raspLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs sm:text-sm text-muted-foreground hover:underline"
            >
              Source: RASP
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
