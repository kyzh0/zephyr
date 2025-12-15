import { useEffect, useState, useCallback, useMemo } from "react";
import { getCamById, loadCamImages, listCams } from "@/services/cam.service";
import type { ICam, ICamImage } from "@/models/cam.model";
import { getDistance } from "@/lib/utils";

interface UseWebcamOptions {
  id?: string;
  autoLoad?: boolean;
}

interface UseWebcamResult {
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
      setError(err instanceof Error ? err : new Error("Failed to load images"));
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
      setError(
        err instanceof Error ? err : new Error("Failed to fetch webcam")
      );
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
  const [webcams, setWebcams] = useState<ICam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cams = await listCams();
      if (cams) {
        setWebcams(cams);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch webcams")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    webcams,
    isLoading,
    error,
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

interface UseNearbyWebcamsResult {
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
  const [allWebcams, setAllWebcams] = useState<ICam[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const cams = await listCams();
      if (cams) {
        setAllWebcams(cams);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch webcams")
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // Filter and sort webcams by distance
  const nearbyWebcams = useMemo(() => {
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
  }, [allWebcams, latitude, longitude, maxDistance, limit]);

  return {
    webcams: nearbyWebcams,
    isLoading,
    error,
    refetch,
  };
}
