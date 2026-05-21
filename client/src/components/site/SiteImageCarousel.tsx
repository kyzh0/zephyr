import { useState, useEffect } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi
} from '@/components/ui/carousel';

interface SlideImage {
  url: string;
  caption: string;
}

interface Props {
  images: SlideImage[];
  showArrows?: boolean;
}

export function SiteImageCarousel({ images, showArrows = false }: Props) {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  return (
    <div className="space-y-2">
      <Carousel setApi={setApi} className="overflow-hidden rounded-md">
        <CarouselContent className="ml-0">
          {images.map((img: SlideImage, i: number) => (
            <CarouselItem key={img.url} className="h-56 pl-0 sm:h-72 bg-muted">
              <img
                src={img.url}
                alt={img.caption || `Site photo ${i + 1}`}
                className="w-full h-full object-cover"
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

      {current?.caption && (
        <p className="text-xs text-muted-foreground text-center px-2">{current.caption}</p>
      )}

      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 justify-center">
          {images.map((img: SlideImage, i: number) => (
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
                alt={img.caption || `Thumbnail ${i + 1}`}
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
