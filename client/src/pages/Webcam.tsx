import { useEffect } from 'react';
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

import { getWebcamTypeName } from '@/lib/utils';
import { useWebcamWithImages, useIsMobile } from '@/hooks';
import { ApiError } from '@/services/api-error';

export default function Webcam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { webcam, images, isStale, error } = useWebcamWithImages(id);

  // Navigate back if webcam not found
  useEffect(() => {
    if (error instanceof ApiError && error.status === 404) navigate('/', { replace: true });
  }, [error, navigate]);

  return (
    <Dialog open onOpenChange={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}>
      {webcam && (
        <SEO
          title={`${webcam.name} Webcam`}
          description={`Live webcam view of ${webcam.name}. Check current weather conditions visually for free flying and wind sports in New Zealand.`}
          path={`/webcams/${id}`}
        />
      )}
      <DialogContent
        className={`${isMobile ? 'max-w-[95vw] lg:max-w-2xl md:max-w-md' : 'max-w-6xl'} max-h-[95vh] p-4 sm:p-6 focus:outline-none`}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-base sm:text-lg">
            {webcam?.name ?? <Skeleton className="h-6 sm:h-7 w-36 sm:w-44 mx-auto" />}
          </DialogTitle>
          <DialogDescription className="sr-only">Webcam images and current view.</DialogDescription>
        </DialogHeader>

        <div className="overflow-hidden">
          {!webcam ? (
            <Skeleton className="w-full aspect-video" />
          ) : isStale ? (
            <p className="text-destructive">No images in the last 24h.</p>
          ) : images.length ? (
            <ImageCarousel
              images={images.map((img) => ({
                url: `${import.meta.env.VITE_FILE_SERVER_PREFIX}/${img.url}`,
                label: formatInTimeZone(new Date(img.time), 'Pacific/Auckland', 'dd MMM HH:mm')
              }))}
              initialIndex={images.length - 1}
              maxHeight={isMobile ? '60vh' : '90vh'}
              showArrows={!isMobile}
              showSlider
              hideAnimation
              alt={webcam.name}
            />
          ) : (
            <Skeleton className="w-full aspect-video" />
          )}
        </div>

        {webcam && webcam.type !== 'metservice' && (
          <div className="flex items-center justify-end">
            <a
              href={webcam.externalLink}
              target="_blank"
              rel="noreferrer"
              className="text-xs sm:text-sm text-muted-foreground hover:underline"
            >
              Source: {getWebcamTypeName(webcam.type)}
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
