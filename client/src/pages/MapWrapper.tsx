import { Outlet, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks";
import Map from "./Map";

/**
 * Wrapper component that conditionally renders the Map page
 * based on device size. On mobile/tablet, child routes render
 * without the Map for better performance.
 */
export default function MapWrapper() {
  const isMobile = useIsMobile();
  const location = useLocation();

  // Check if we're at the root path (no child route)
  // Paths that should show the Map on mobile
  const isRootPath =
    location.pathname === "/" ||
    location.pathname.startsWith("/soundings/") ||
    location.pathname.startsWith("/webcams/") ||
    location.pathname.startsWith("/grid");

  // On mobile at root, show the Map
  // On mobile with a child route, show just the child (full screen)
  if (isMobile) {
    if (isRootPath) {
      return <Map />;
    }
    return <Outlet />;
  }

  // On desktop, always render Map with child routes as overlays
  return <Map />;
}
