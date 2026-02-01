interface SkeletonProps {
  width: string | number;
  height: string | number;
  className?: string;
}

export function Skeleton({ width, height, className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 ${className}`} style={{ width, height }} />
  );
}
