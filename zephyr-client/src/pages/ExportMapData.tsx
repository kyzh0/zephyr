import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { format, startOfDay, endOfDay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { CalendarIcon, Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks";
import { exportXlsx } from "@/services/public.service";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

const DEFAULT_LON = 172.5;
const DEFAULT_LAT = -42;
const DEFAULT_RADIUS = 50;

const formSchema = z
  .object({
    apiKey: z.string().min(1, "API key is required"),
    dateRange: z.object({
      from: z.date(),
      to: z.date(),
    }),
    radius: z.number().min(10).max(100),
  })
  .refine((data) => data.dateRange.from <= data.dateRange.to, {
    message: "Start date must come before end date",
    path: ["dateRange"],
  })
  .refine(
    (data) => {
      const diffMs =
        data.dateRange.to.getTime() - data.dateRange.from.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 180;
    },
    {
      message: "Maximum 180 days of data",
      path: ["dateRange"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

const NZ_TIMEZONE = "Pacific/Auckland";

/**
 * Convert a date (treating its year/month/day as NZT) to a UTC timestamp.
 * e.g., if user picks "2024-01-15", we want the UTC time for 2024-01-15 00:00:00 NZT
 */
function nztDateToUtcTimestamp(date: Date, endOfDayTime = false): number {
  // Get year/month/day from the date picker (these represent NZT dates)
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // Create a date object for start or end of that day
  const localDate = endOfDayTime
    ? endOfDay(new Date(year, month, day))
    : startOfDay(new Date(year, month, day));

  // Convert from NZT to UTC
  const utcDate = fromZonedTime(localDate, NZ_TIMEZONE);
  return Math.floor(utcDate.getTime() / 1000);
}

interface MapViewProps {
  onCoordinatesChange: (coords: { lng: number; lat: number }) => void;
  radiusKm: number;
}

function MapView({ onCoordinatesChange, radiusKm }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const markerCoords = useRef<{ lng: number; lat: number } | null>(null);
  const radiusRef = useRef<number | null>(null);
  const circleSourceId = "circle-radius";

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_GL_KEY as string;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v11",
      center: [172.5, -41],
      zoom: 4.3,
    });

    map.current.on("load", () => {
      if (!map.current) return;

      // Add circle source
      map.current.addSource(circleSourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.current.addLayer({
        id: circleSourceId,
        type: "fill",
        source: circleSourceId,
        layout: {},
        paint: {
          "fill-color": "#0074D9",
          "fill-opacity": 0.2,
        },
      });

      // Default marker and circle
      marker.current = new mapboxgl.Marker()
        .setLngLat([DEFAULT_LON, DEFAULT_LAT])
        .addTo(map.current);
      markerCoords.current = { lng: DEFAULT_LON, lat: DEFAULT_LAT };

      updateCircle(DEFAULT_LON, DEFAULT_LAT, DEFAULT_RADIUS);
    });

    map.current.on("click", (e) => {
      if (!map.current) return;

      const { lng, lat } = e.lngLat;
      markerCoords.current = { lng, lat };

      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new mapboxgl.Marker()
          .setLngLat([lng, lat])
          .addTo(map.current);
      }

      const r = radiusRef.current ?? radiusKm;
      if (r > 0) {
        updateCircle(lng, lat, r);
      }

      onCoordinatesChange({ lng, lat });
    });

    return () => {
      map.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update circle when radius changes
  useEffect(() => {
    if (!map.current || !markerCoords.current) return;

    const { lng, lat } = markerCoords.current;
    if (radiusKm > 0) {
      radiusRef.current = radiusKm;
      updateCircle(lng, lat, radiusKm);
    }
  }, [radiusKm]);

  function updateCircle(lng: number, lat: number, radius: number) {
    if (!map.current) return;

    const source = map.current?.getSource(circleSourceId);
    if (source?.type !== "geojson") return;

    // Create circle polygon using simple math (approximate)
    const points = 64;
    const km = radius;
    const coordinates: [number, number][] = [];

    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * 2 * Math.PI;
      const dx = km / (111.32 * Math.cos((lat * Math.PI) / 180));
      const dy = km / 110.574;
      coordinates.push([
        lng + dx * Math.cos(angle),
        lat + dy * Math.sin(angle),
      ]);
    }

    source.setData({
      type: "Feature",
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [coordinates],
      },
    });
  }

  return (
    <div
      ref={mapContainer}
      className="w-full h-[40vh] sm:h-[45vh] rounded-md overflow-hidden"
    />
  );
}

export default function ExportMapData() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [coords, setCoords] = useState({ lng: DEFAULT_LON, lat: DEFAULT_LAT });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: "",
      dateRange: {
        from: new Date(Date.now() - 24 * 60 * 60 * 1000),
        to: new Date(),
      },
      radius: DEFAULT_RADIUS,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const radius = form.watch("radius");

  async function onSubmit(values: FormValues) {
    if (loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      // Convert selected dates to UTC timestamps (treating selections as NZT)
      const unixFrom = nztDateToUtcTimestamp(values.dateRange.from);
      const unixTo = nztDateToUtcTimestamp(values.dateRange.to, true);

      const url = await exportXlsx(
        values.apiKey,
        unixFrom,
        unixTo,
        coords.lat,
        coords.lng,
        values.radius
      );

      setLoading(false);

      if (url === "INVALID KEY") {
        setErrorMsg("Invalid API key");
        return;
      }

      if (!url) {
        setErrorMsg("Something went wrong");
        return;
      }

      // Trigger download
      const a = document.createElement("a");
      a.download = "zephyr-export";
      a.href = url;
      a.target = "_blank";
      a.click();
      toast.success("Export started. Check your downloads.");
      handleClose();
    } catch (error) {
      setLoading(false);
      console.error(error);
      setErrorMsg("Something went wrong");
      toast.error("Something went wrong");
    }
  }

  function handleClose() {
    navigate("/");
  }

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <MapView onCoordinatesChange={setCoords} radiusKm={radius} />

        {/* Radius slider */}
        <FormField
          control={form.control}
          name="radius"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Radius</FormLabel>
                <span className="text-sm text-muted-foreground">
                  {field.value}km
                </span>
              </div>
              <FormControl>
                <Slider
                  min={10}
                  max={100}
                  step={10}
                  value={[field.value]}
                  onValueChange={(v) => field.onChange(v[0])}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date range picker */}
        <FormField
          control={form.control}
          name="dateRange"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date Range</FormLabel>
              <FormDescription>
                Dates are inclusive and in New Zealand Time (NZT)
              </FormDescription>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value?.from && "text-muted-foreground"
                      )}
                    >
                      {field.value?.from ? (
                        field.value.to ? (
                          <>
                            {format(field.value.from, "dd/MM/yyyy")} -{" "}
                            {format(field.value.to, "dd/MM/yyyy")}
                          </>
                        ) : (
                          format(field.value.from, "dd/MM/yyyy")
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={field.value as DateRange}
                    onSelect={(range) => {
                      if (range?.from && range?.to) {
                        field.onChange({ from: range.from, to: range.to });
                      } else if (range?.from) {
                        field.onChange({ from: range.from, to: range.from });
                      }
                    }}
                    disabled={(date) =>
                      date > new Date() || date < new Date("2020-01-01")
                    }
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* API Key */}
        <FormField
          control={form.control}
          name="apiKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>API Key</FormLabel>
              <FormControl>
                <Input placeholder="Enter your API key" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Export
        </Button>

        {/* Error message */}
        {errorMsg && (
          <p className="text-sm text-destructive text-center">{errorMsg}</p>
        )}
      </form>
    </Form>
  );

  // Mobile: Full-screen layout
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Export Data</h1>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">{formContent}</div>
      </div>
    );
  }

  // Desktop: Dialog overlay
  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">Export Data</DialogTitle>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
