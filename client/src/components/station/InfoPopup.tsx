interface InfoPopupProps {
  message: string;
  mouseCoords: { x: number; y: number };
}

export function InfoPopup({ message, mouseCoords }: InfoPopupProps) {
  return (
    <div
      className="absolute z-[100] min-w-[40vh] -translate-x-[70%] rounded-lg border bg-pink-50 p-4 shadow-lg"
      style={{
        top: mouseCoords.y + 20,
        left: mouseCoords.x,
      }}
    >
      <h2 className="mb-2 text-center text-lg font-bold">INFO</h2>
      <p className="text-center text-sm">{message}</p>
    </div>
  );
}
