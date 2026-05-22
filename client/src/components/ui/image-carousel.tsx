import { useState, useEffect, useRef, useMemo } from 'react';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi
} from '@/components/ui/carousel';
import { Slider } from '@/components/ui/slider';

export interface CarouselImage {
  url: string;
  label?: string;
}

interface Props {
  images: CarouselImage[];
  initialIndex?: number;
  maxHeight?: string;
  contain?: boolean;
  center?: boolean;
  showArrows?: boolean;
  showThumbnails?: boolean;
  showSlider?: boolean;
  hideAnimation?: boolean;
  alt?: string;
}

export function ImageCarousel({
  images,
  initialIndex = 0,
  maxHeight = '60vh',
  contain = false,
  center = false,
  showArrows = false,
  showThumbnails = false,
  showSlider = false,
  hideAnimation = false,
  alt = 'Image'
}: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  // Set stable initial index
  const carouselOpts = useMemo(
    () => ({ startIndex: initialIndex, ...(hideAnimation && { duration: 0 }) }),
    [initialIndex, hideAnimation]
  );

  // Only load src for slides near the current position; expand set as user scrubs
  const [loadedSet, setLoadedSet] = useState<Set<number>>(() => {
    const s = new Set<number>();
    for (const offset of [-1, 0, 1]) {
      const idx = initialIndex + offset;
      if (idx >= 0 && idx < images.length) s.add(idx);
    }
    return s;
  });

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  // Sync slider/label position when initialIndex changes programmatically
  useEffect(() => {
    setSelectedIndex(initialIndex);
  }, [initialIndex]);

  // Scroll carousel when initialIndex changes after mount
  const apiReadyRef = useRef(false);
  useEffect(() => {
    if (!api) return;
    if (!apiReadyRef.current) {
      apiReadyRef.current = true;
      return;
    }
    api.scrollTo(initialIndex, false);
  }, [api, initialIndex]);

  // Expand loaded set as user navigates
  useEffect(() => {
    setLoadedSet((prev) => {
      const toLoad = [-1, 0, 1]
        .map((o) => selectedIndex + o)
        .filter((i) => i >= 0 && i < images.length);
      if (toLoad.every((i) => prev.has(i))) return prev;
      const next = new Set(prev);
      toLoad.forEach((i) => next.add(i));
      return next;
    });
  }, [selectedIndex, images.length]);

  if (!images.length) return null;

  const current = images[selectedIndex];

  return (
    <div className={`space-y-2${center ? ' flex flex-col h-full' : ' w-full'}`}>
      <Carousel
        setApi={setApi}
        opts={carouselOpts}
        className={`overflow-hidden rounded-md${center ? ' flex-1 min-h-0' : ''}`}
      >
        <CarouselContent className="ml-0">
          {images.map((img, i) => (
            <CarouselItem key={img.url} className="pl-0">
              {contain ? (
                <div style={{ height: maxHeight }} className="w-full">
                  <img
                    src={loadedSet.has(i) ? img.url : undefined}
                    alt={img.label || `${alt} ${i + 1}`}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>
              ) : center ? (
                <img
                  src={loadedSet.has(i) ? img.url : undefined}
                  alt={img.label || `${alt} ${i + 1}`}
                  className="portrait:w-full portrait:h-auto landscape:h-full landscape:w-auto max-w-full block mx-auto"
                  draggable={false}
                />
              ) : (
                <img
                  src={loadedSet.has(i) ? img.url : undefined}
                  alt={img.label || `${alt} ${i + 1}`}
                  style={{ maxHeight }}
                  className="w-full h-auto"
                  draggable={false}
                />
              )}
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

      {current?.label && !showSlider && (
        <p className="text-xs text-muted-foreground text-center px-2">{current.label}</p>
      )}

      {showSlider && images.length > 1 && (
        <div className="space-y-1 px-2 mt-4">
          <Slider
            min={0}
            max={images.length - 1}
            step={1}
            value={[selectedIndex]}
            onValueChange={(values) => {
              const i = values[0] ?? 0;
              setSelectedIndex(i);
              api?.scrollTo(i, false);
            }}
          />
          {current?.label && (
            <p className="text-xs text-muted-foreground text-center">{current.label}</p>
          )}
        </div>
      )}

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
