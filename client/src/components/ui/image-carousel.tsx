import { useState, useEffect } from 'react';

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
  showArrows?: boolean;
  showThumbnails?: boolean;
  showSlider?: boolean;
  prefetch?: boolean;
  alt?: string;
}

export function ImageCarousel({
  images,
  initialIndex = 0,
  maxHeight = '60vh',
  showArrows = false,
  showThumbnails = false,
  showSlider = false,
  prefetch = false,
  alt = 'Image'
}: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelectedIndex(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;
    api.scrollTo(initialIndex, false);
  }, [api, initialIndex]);

  useEffect(() => {
    if (!prefetch) return;
    images.forEach((img) => {
      new Image().src = img.url;
    });
  }, [prefetch, images]);

  if (!images.length) return null;

  const current = images[selectedIndex];

  return (
    <div className="space-y-2">
      <Carousel setApi={setApi} className="overflow-hidden rounded-md bg-muted">
        <CarouselContent className="ml-0">
          {images.map((img, i) => (
            <CarouselItem key={img.url} className="pl-0 flex items-center justify-center">
              <img
                src={img.url}
                alt={img.label || `${alt} ${i + 1}`}
                style={{ maxHeight }}
                className="max-w-full w-auto h-auto"
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

      {current?.label && !showSlider && (
        <p className="text-xs text-muted-foreground text-center px-2">{current.label}</p>
      )}

      {showSlider && images.length > 1 && (
        <div className="space-y-1 px-2">
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
