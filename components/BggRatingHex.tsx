import { memo } from "react";

type BggRatingSize = "sm" | "md" | "lg";

interface BggRatingHexProps {
  rating: number;
  size?: BggRatingSize;
  className?: string;
  title?: string;
}

const HEX_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

function getRatingColor(rating: number): string {
  if (rating >= 8) return "bg-green-600";
  if (rating >= 7) return "bg-sky-500";
  if (rating >= 6) return "bg-blue-700";
  return "bg-red-600";
}

const sizeClasses: Record<BggRatingSize, string> = {
  sm: "w-8 h-7 text-[10px]",
  md: "w-10 h-9 text-xs",
  lg: "w-12 h-11 text-sm",
};

export const BggRatingHex = memo(function BggRatingHex({
  rating,
  size = "sm",
  className = "",
  title = "BoardGameGeek score",
}: BggRatingHexProps) {
  const rounded = Math.round(rating * 10) / 10;
  return (
    <span
      title={title}
      className={`inline-flex items-center justify-center font-black text-white leading-none shrink-0 ${sizeClasses[size]} ${getRatingColor(rounded)} ${className}`}
      style={{ clipPath: HEX_CLIP }}
    >
      {rounded.toFixed(1)}
    </span>
  );
});
