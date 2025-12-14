import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCamById, loadCamImages } from "@/services/cam.service";
import type { ICam, ICamImage } from "@/models/cam.model";
import { getWebcamTypeName } from "@/lib/utils";
import { formatInTimeZone } from "date-fns-tz";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Webcam() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [webcam, setWebcam] = useState<ICam | null>(null);
  const [images, setImages] = useState<ICamImage[]>([]);
  const [index, setIndex] = useState(0);
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const cam = await getCamById(id);
      if (!cam) return navigate(-1);
      setWebcam(cam);

      const stale =
        Date.now() - new Date(cam.currentTime).getTime() >= 86400000;
      setIsStale(stale);
      if (stale) return;

      const imgs = await loadCamImages(id);
      if (imgs) {
        imgs.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        setImages(imgs);
        setIndex(imgs.length - 1);
      }
    })();
  }, [id, navigate]);

  return (
    <Dialog open onOpenChange={() => navigate(-1)}>
      <DialogContent className="max-w-4xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-base sm:text-lg">
            {webcam?.name ?? (
              <Skeleton className="h-6 sm:h-7 w-36 sm:w-44 mx-auto" />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          {!webcam ? (
            <Skeleton className="w-full aspect-video" />
          ) : isStale ? (
            <p className="text-destructive">No images in the last 24h.</p>
          ) : images.length ? (
            <>
              <img
                src={`${import.meta.env.VITE_FILE_SERVER_PREFIX}/${
                  images[index].url
                }`}
                alt={webcam.name}
                className="w-full max-h-[60vh] object-contain"
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
                    "Pacific/Auckland",
                    "dd MMM HH:mm"
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
          ) : (
            <Skeleton className="w-full aspect-video" />
          )}
        </div>

        {webcam && (
          <a
            href={webcam.externalLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs sm:text-sm text-muted-foreground hover:underline self-end"
          >
            Source: {getWebcamTypeName(webcam.type)}
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
