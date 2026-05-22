import { useEffect, useState, type CSSProperties } from 'react';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi
} from '@/components/ui/carousel';
import { Slider } from '@/components/ui/slider';
import { useIsPortrait } from '@/hooks';

interface CarouselImage {
  url: string;
  label?: string;
}

interface Props {
  images: CarouselImage[];
  initialIndex?: number;
  fit: 'contain' | 'intrinsic';
  showArrows?: boolean;
  showSlider?: boolean;
  showThumbnails?: boolean;
  alt?: string;
}

/** Reserved vertical px inside an intrinsic-mode dialog for header, padding, caption, slider, gaps. */
const INTRINSIC_FOOTER_PX = 160;

export function ImageCarousel({
  images,
  initialIndex = 0,
  fit,
  showArrows = false,
  showSlider = false,
  showThumbnails = false,
  alt = 'Image'
}: Props) {
  const [api, setApi] = useState<CarouselApi>();
  // initialIndex is captured at mount and never
  // re-applied to preserve position when images updated
  const [mountIndex] = useState(initialIndex);
  const [selectedIndex, setSelectedIndex] = useState(mountIndex);
  const isPortrait = useIsPortrait();

  // All instrinsic carousel images assumed to share same AR (webcams, soundings)
  const firstUrl = images[0]?.url;
  const [measuredAR, setMeasuredAR] = useState<number | null>(null);
  useEffect(() => {
    if (fit !== 'intrinsic' || !firstUrl) return;
    setMeasuredAR(null);
    const img = new Image();
    img.src = firstUrl;
    const onLoad = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setMeasuredAR(img.naturalWidth / img.naturalHeight);
      }
    };
    img.addEventListener('load', onLoad);
    return () => img.removeEventListener('load', onLoad);
  }, [fit, firstUrl]);

  // Embla options - no slide animation for intrinsic
  const [carouselOpts] = useState(() => ({
    startIndex: mountIndex,
    ...(fit === 'intrinsic' && { duration: 0 })
  }));

  // Sync embla -> selectedIndex
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  if (!images.length) return null;

  const current = images[selectedIndex];

  // Shared caption + slider footer
  const captionAndSlider = (
    <>
      {current?.label && !showSlider && (
        <p className="text-xs text-muted-foreground text-center px-2">{current.label}</p>
      )}
      {showSlider && images.length > 1 && (
        <div className="space-y-2 px-2 mb-1">
          {current?.label && (
            <p className="text-xs text-muted-foreground text-center">{current.label}</p>
          )}
          <Slider
            min={0}
            max={images.length - 1}
            step={1}
            value={[selectedIndex]}
            onValueChange={(values) => {
              const i = values[0] ?? 0;
              setSelectedIndex(i);
              api?.scrollTo(i);
            }}
          />
        </div>
      )}
    </>
  );

  // ─── Contain mode ─────────────────────────────────────────────────────────
  // Fixed-height box, full parent width. Images preserve their natural AR
  // inside via object-contain (letterboxes when needed).
  if (fit === 'contain') {
    const containHeight = isPortrait ? '30vh' : '20vh';
    return (
      <div className="w-full flex flex-col gap-2">
        <Carousel setApi={setApi} opts={carouselOpts} className="w-full overflow-hidden rounded-md">
          <CarouselContent className="ml-0">
            {images.map((img, i) => (
              <CarouselItem key={img.url} className="pl-0">
                <div className="w-full" style={{ height: containHeight }}>
                  <img
                    src={img.url}
                    alt={img.label || `${alt} ${i + 1}`}
                    loading="lazy"
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {showArrows && (
            <>
              <CarouselPrevious className="left-2 border-0 bg-black/40 text-white hover:bg-black/60" />
              <CarouselNext className="right-2 border-0 bg-black/40 text-white hover:bg-black/60" />
            </>
          )}
        </Carousel>

        {captionAndSlider}

        {showThumbnails && images.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 justify-center">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => api?.scrollTo(i)}
                className={`shrink-0 w-10 h-10 rounded overflow-hidden border-2 transition-colors ${
                  i === selectedIndex ? 'border-primary' : 'border-transparent'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.label || `Thumbnail ${i + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Intrinsic mode ───────────────────────────────────────────────────────
  // Dialog wraps the image's natural AR. Don't render until AR is known so the
  // dialog pops to its final size in one step.
  if (measuredAR === null) return null;

  // Landscape viewport: height locked at (95vh - footer), width follows AR.
  // Portrait viewport: fill the parent dialog's content width; aspect-ratio
  // derives the height. The parent dialog supplies the 95vw outer cap, which
  // — minus its own padding — becomes our `100%`.
  const dims: CSSProperties = isPortrait
    ? { width: '100%', aspectRatio: measuredAR }
    : {
        width: `calc((95vh - ${INTRINSIC_FOOTER_PX}px) * ${measuredAR})`,
        height: `calc(95vh - ${INTRINSIC_FOOTER_PX}px)`
      };

  return (
    <div
      className="flex flex-col gap-2"
      style={isPortrait ? { width: '100%' } : { width: dims.width }}
    >
      <Carousel
        setApi={setApi}
        opts={carouselOpts}
        className="overflow-hidden rounded-md"
        style={dims}
      >
        <CarouselContent className="ml-0 h-full">
          {images.map((img, i) => (
            <CarouselItem key={img.url} className="pl-0 h-full">
              <img
                src={img.url}
                alt={img.label || `${alt} ${i + 1}`}
                loading="lazy"
                className="w-full h-full object-contain block"
                draggable={false}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {showArrows && (
          <>
            <CarouselPrevious className="left-2 border-0 bg-black/40 text-white hover:bg-black/60" />
            <CarouselNext className="right-2 border-0 bg-black/40 text-white hover:bg-black/60" />
          </>
        )}
      </Carousel>

      {captionAndSlider}
    </div>
  );
}
