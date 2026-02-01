import { type ReactNode } from 'react';

interface LandingMarkerProps {
  isOfficial?: boolean;
  size?: number;
  borderWidth?: number;
}

/**
 * LandingMarker component - displays a circular marker with the landing logo
 * and an orange border arc indicating valid wind bearings
 */
export const LandingMarker = ({
  isOfficial,
  size = 50,
  borderWidth = 15
}: LandingMarkerProps): ReactNode => {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* Circle container with landing logo */}
      <div
        className={`absolute inset-0 rounded-full border-2 overflow-hidden flex items-center justify-center bg-white ${
          isOfficial ? 'border-[#d7ac00]' : 'border-black'
        }`}
        style={{
          margin: borderWidth,
          width: size - borderWidth * 2,
          height: size - borderWidth * 2,
          backgroundColor: 'black'
        }}
      >
        <img src="/kiwi.png" className="w-3/4 h-3/4 object-contain" />
      </div>
    </div>
  );
};
