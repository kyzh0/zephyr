import { useEffect, useRef } from 'react';

interface InfoPopupProps {
  message: string;
}

export function InfoPopup({ message }: InfoPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = popupRef.current;
    if (!el) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;

      const width = el.offsetWidth;
      const windowWidth = window.innerWidth;

      let left: number;

      // If centering on cursor would push it off the right edge
      if (x + width / 2 > windowWidth) {
        left = (windowWidth - width) / 2;
      } else {
        left = x - width / 2;
      }

      el.style.left = `${left}px`;
      el.style.top = `${y + 20}px`;
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={popupRef}
      className="absolute z-[100] min-w-[40vh] rounded-lg border bg-pink-50 p-4 shadow-lg"
      style={{ left: '50%', transform: 'translateX(-50%)' }}
    >
      <h2 className="mb-2 text-center text-lg font-bold">INFO</h2>
      <p className="text-center text-sm">{message}</p>
    </div>
  );
}
