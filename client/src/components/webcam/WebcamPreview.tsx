import React from "react";
import { useNavigate } from "react-router-dom";

interface WebcamPreviewProps {
  _id: string | number;
  name: string;
  distance: number;
  currentUrl?: string;
  onClick?: () => void;
}

export const WebcamPreview: React.FC<WebcamPreviewProps> = ({
  _id,
  name,
  distance,
  currentUrl,
  onClick,
}) => {
  const navigate = useNavigate();

  return (
    <div
      key={String(_id)}
      className="flex flex-col items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
      onClick={onClick ?? (() => navigate(`/webcams/${_id}`))}
    >
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-1">
        <span className="text-xs sm:text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">
          {(distance / 1000).toFixed(1)}km away
        </span>
      </div>
      {currentUrl && (
        <img
          src={`${import.meta.env.VITE_FILE_SERVER_PREFIX}/${currentUrl}`}
          alt={name}
          loading="lazy"
          className="h-12 w-20 md:h-20 md:w-30 lg:w-80 lg:h-50 object-cover rounded"
        />
      )}
    </div>
  );
};
