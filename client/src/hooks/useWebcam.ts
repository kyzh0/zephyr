import { useEffect, useState, useCallback, useMemo } from "react";
import { getCamById, loadCamImages, listCams } from "@/services/cam.service";
import type { ICam, ICamImage } from "@/models/cam.model";
import { getDistance, handleError } from "@/lib/utils";

// Module-level singleton cache for webcams
let cachedWebcams: ICam[] | null = null;
let cachedWebcamsError: Error | null = null;
let cachedWebcamsLoading = false;
let webcamsListeners: (() => void)[] = [];

async function fetchWebcamsAndNotify() {
  cachedWebcamsLoading = true;
  notifyWebcamsListeners();
  try {
    const result = await listCams();
    cachedWebcams = result ?? [];
    cachedWebcamsError = null;
  } catch (err) {
    cachedWebcamsError = handleError(err, "Operation failed");
    cachedWebcams = [];
  } finally {
    cachedWebcamsLoading = false;
    notifyWebcamsListeners();
  }
}

function notifyWebcamsListeners() {
  webcamsListeners.forEach((fn) => fn());
}

interface UseWebcamOptions {
  id?: string;
  autoLoad?: boolean;
}

export interface UseWebcamResult {
  webcam: ICam | null;
  images: ICamImage[];
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  loadImages: () => Promise<void>;
}

/**
 * Hook for fetching and managing webcam data
 * @param options - Configuration options
 * @param options.id - Webcam ID to fetch. If not provided, no initial fetch occurs
 * @param options.autoLoad - Whether to automatically load images (default: true)
 * @returns Webcam data and control functions
 */
export function useWebcam({
  id,
  autoLoad = true,
}: UseWebcamOptions = {}): UseWebcamResult {
  const [webcam, setWebcam] = useState<ICam | null>(null);
  const [images, setImages] = useState<ICamImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadImages = useCallback(async () => {
    if (!id || !webcam) return;

    try {
      const imgs = await loadCamImages(id);
      if (imgs) {
        imgs.sort(
          (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
        );
        setImages(imgs);
      }
    } catch (err) {
      setError(handleError(err, "Failed to load webcam images"));
    }
  }, [id, webcam]);

  const refetch = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const cam = await getCamById(id);
      if (!cam) {
        throw new Error("Webcam not found");
      }

      setWebcam(cam);

      // Check if webcam is stale (no images in last 24 hours)
      const stale =
        Date.now() - new Date(cam.currentTime).getTime() >= 86400000;
      setIsStale(stale);

      // Load images if not stale and autoLoad is enabled
      if (!stale && autoLoad) {
        const imgs = await loadCamImages(id);
        if (imgs) {
          imgs.sort(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
          );
          setImages(imgs);
        }
      }
    } catch (err) {
      setError(handleError(err, "Failed to load webcam data"));
    } finally {
      setIsLoading(false);
    }
  }, [id, autoLoad]);

  // Initial fetch when id changes
  useEffect(() => {
    if (id) {
      void refetch();
    }
  }, [id, refetch]);

  return {
    webcam,
    images,
    isLoading,
    isStale,
    error,
    refetch,
    loadImages,
  };
}

/**
 * Hook for fetching all webcams
 * @returns List of all webcams with loading and error states
 */
export function useWebcams() {
  const [, forceUpdate] = useState(0);

  // Subscribe to cache updates
  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    webcamsListeners.push(update);
    return () => {
      webcamsListeners = webcamsListeners.filter((fn) => fn !== update);
    };
  }, []);

  // Fetch once if needed
  useEffect(() => {
    if (cachedWebcams === null && !cachedWebcamsLoading) {
      fetchWebcamsAndNotify();
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchWebcamsAndNotify();
  }, []);

  return {
    webcams: cachedWebcams ?? [],
    isLoading: cachedWebcamsLoading || cachedWebcams === null,
    error: cachedWebcamsError,
    refetch,
  };
}

interface UseNearbyWebcamsOptions {
  latitude: number;
  longitude: number;
  maxDistance?: number; // in meters, default 50km
  limit?: number; // max number of results
}

interface WebcamWithDistance extends ICam {
  distance: number; // distance in meters
}

export interface UseNearbyWebcamsResult {
  webcams: WebcamWithDistance[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching nearby webcams filtered by distance
 * @param options - Configuration options
 * @param options.latitude - Center point latitude
 * @param options.longitude - Center point longitude
 * @param options.maxDistance - Maximum distance in meters (default: 50000m / 50km)
 * @param options.limit - Maximum number of results to return
 * @returns Nearby webcams sorted by distance with loading and error states
 */
export function useNearbyWebcams({
  latitude,
  longitude,
  maxDistance = 50000,
  limit,
}: UseNearbyWebcamsOptions): UseNearbyWebcamsResult {
  const { webcams: allWebcams, isLoading, error, refetch } = useWebcams();

  // Filter and sort webcams by distance
  const nearbyWebcams = useMemo(() => {
    // Don't compute if webcams haven't loaded yet or coordinates are invalid
    if (
      isLoading ||
      !allWebcams?.length ||
      (latitude === 0 && longitude === 0)
    ) {
      return [];
    }

    const webcamsWithDistance: WebcamWithDistance[] = allWebcams
      .map((cam) => {
        const distance = getDistance(
          latitude,
          longitude,
          cam.location.coordinates[0],
          cam.location.coordinates[1]
        );
        return {
          ...cam,
          distance,
        };
      })
      .filter((cam) => cam.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance);

    return limit ? webcamsWithDistance.slice(0, limit) : webcamsWithDistance;
  }, [allWebcams, latitude, longitude, maxDistance, limit, isLoading]);

  return {
    webcams: nearbyWebcams,
    isLoading,
    error,
    refetch,
  };
}
