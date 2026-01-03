import { useEffect, useRef } from "react";

interface MousePositionRef {
  current: { x: number; y: number };
}

interface InfoPopupProps {
  message: string;
  mouseRef: MousePositionRef;
}

export function InfoPopup({ message, mouseRef }: InfoPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let rafId: number;

    const updatePosition = () => {
      if (!popupRef.current) return;

      const { x, y } = mouseRef.current;

      popupRef.current.style.transform = `translate(${x}px, ${y + 20}px)`;

      rafId = requestAnimationFrame(updatePosition);
    };

    rafId = requestAnimationFrame(updatePosition);

    return () => cancelAnimationFrame(rafId);
  }, [mouseRef]);

  return (
    <div
      ref={popupRef}
      className="absolute z-[100] min-w-[40vh] -translate-x-[70%] rounded-lg border bg-pink-50 p-4 shadow-lg"
    >
      <h2 className="mb-2 text-center text-lg font-bold">INFO</h2>
      <p className="text-center text-sm">{message}</p>
    </div>
  );
}
