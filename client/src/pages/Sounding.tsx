import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatInTimeZone } from 'date-fns-tz';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import SEO from '@/components/SEO';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { ApiError } from '@/services/api-error';
import { useSounding } from '@/hooks';

export default function Sounding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const { sounding, error } = useSounding(id);

  // Navigate back if sounding not found
  useEffect(() => {
    if (error instanceof ApiError && error.status === 404) navigate('/', { replace: true });
  }, [error, navigate]);

  // Sort images and pick initial index when data arrives
  const sortedImages = sounding?.images;
  const images = useMemo(() => {
    if (!sortedImages?.length) return [];
    return [...sortedImages].sort(
      (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  }, [sortedImages]);

  // Set initial index to first future image when images change
  useEffect(() => {
    if (!images.length) return;
    const future = images.findIndex(
      (img) => new Date(img.time).getTime() > Date.now() - 1800000 // 30 min
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIndex(future >= 0 ? future : images.length - 1);
  }, [images]);
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
        className="max-w-3xl p-4 sm:p-6 focus:outline-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-base sm:text-lg">
            {sounding?.name ?? <Skeleton className="h-6 sm:h-7 w-36 sm:w-44 mx-auto" />}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          {!sounding ? (
            <Skeleton className="w-full aspect-3/4" />
          ) : !images.length ? (
            <p className="text-destructive">Error retrieving today's soundings.</p>
          ) : (
            <>
              <img
                src={`${import.meta.env.VITE_FILE_SERVER_PREFIX}/${images[index].url}`}
                loading="lazy"
                alt={sounding.name}
                className="w-full max-h-[65vh] object-contain"
              />
              <div className="flex items-center gap-2 sm:gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => setIndex((i) => i - 1)}
                  disabled={index === 0}
                >
                  <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
                <span className="text-xs sm:text-sm min-w-24 sm:min-w-28 text-center">
                  {formatInTimeZone(
                    new Date(images[index].time),
                    'Pacific/Auckland',
                    'dd MMM HH:mm'
                  )}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => setIndex((i) => i + 1)}
                  disabled={index === images.length - 1}
                >
                  <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </>
          )}
        </div>

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
