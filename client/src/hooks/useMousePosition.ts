import { useEffect, useState } from "react";

interface MousePosition {
  x: number;
  y: number;
}

export function useMousePosition(): MousePosition {
  const [mouseCoords, setMouseCoords] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handleWindowMouseMove = (event: MouseEvent) => {
      setMouseCoords({
        x: event.clientX,
        y: event.clientY,
      });
    };
    window.addEventListener("mousemove", handleWindowMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
    };
  }, []);

  return mouseCoords;
}
