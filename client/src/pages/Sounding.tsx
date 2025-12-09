import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSoundingById } from "@/services/sounding.service";
import type { ISounding } from "@/models/sounding.model";
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

export default function Sounding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sounding, setSounding] = useState<ISounding | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const data = await getSoundingById(id);
      if (!data) return navigate("/");
      setSounding(data);

      if (!data.images?.length) return;

      data.images.sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
      );
      const future = data.images.findIndex(
        (img) => new Date(img.time).getTime() > Date.now() - 1800000
      );
      setIndex(future >= 0 ? future : data.images.length - 1);
    })();
  }, [id, navigate]);

  const images = sounding?.images ?? [];
  const raspLink = sounding
    ? `http://rasp.nz/rasp/view.php?region=${
        sounding.raspRegion
      }&mod=%2B0&date=${formatInTimeZone(
        images[0]?.time ? new Date(images[0].time) : new Date(),
        "Pacific/Auckland",
        "yyyyMMdd"
      )}&all=sounding${sounding.raspId}&section=${
        sounding.raspRegion
      }.sounding.params`
    : "";

  return (
    <Dialog open onOpenChange={() => navigate("/")}>
      <DialogContent className="max-w-3xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-center text-base sm:text-lg">
            {sounding?.name ?? (
              <Skeleton className="h-6 sm:h-7 w-36 sm:w-44 mx-auto" />
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-1.5 sm:gap-2">
          {!sounding ? (
            <Skeleton className="w-full aspect-[3/4]" />
          ) : !images.length ? (
            <p className="text-destructive">
              Error retrieving today's soundings.
            </p>
          ) : (
            <>
              <img
                src={`${import.meta.env.VITE_FILE_SERVER_PREFIX}/${
                  images[index].url
                }`}
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
          )}
        </div>

        {sounding && (
          <a
            href={raspLink}
            target="_blank"
            rel="noreferrer"
            className="text-xs sm:text-sm text-muted-foreground hover:underline self-end"
          >
            Source: RASP
          </a>
        )}
      </DialogContent>
    </Dialog>
  );
}
