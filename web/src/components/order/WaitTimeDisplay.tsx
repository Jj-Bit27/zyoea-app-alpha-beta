import { FiClock, FiCheck } from "react-icons/fi";

interface WaitTimeDisplayProps {
  estimatedMinutes: number;
  actualMinutes?: number | null;
  size?: "sm" | "md" | "lg";
}

export default function WaitTimeDisplay({
  estimatedMinutes,
  actualMinutes,
  size = "md",
}: WaitTimeDisplayProps) {
  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  if (actualMinutes != null) {
    return (
      <div
        className={`flex items-center ${sizeClasses[size]} text-green-600 dark:text-green-400`}
      >
        <FiCheck size={iconSizes[size]} />
        <span className="font-medium">
          Listo en {actualMinutes} min
        </span>
        {Math.abs(actualMinutes - estimatedMinutes) > 2 && (
          <span className="text-muted-foreground">
            (estimado {estimatedMinutes} min)
          </span>
        )}
      </div>
    );
  }

  if (estimatedMinutes <= 0) {
    return null;
  }

  const isSoon = estimatedMinutes <= 5;
  const isLong = estimatedMinutes > 20;

  let urgencyClass = "text-amber-600 dark:text-amber-400";
  if (isSoon) {
    urgencyClass = "text-green-600 dark:text-green-400";
  } else if (isLong) {
    urgencyClass = "text-orange-600 dark:text-orange-400";
  }

  return (
    <div className={`flex items-center ${sizeClasses[size]} ${urgencyClass}`}>
      <FiClock size={iconSizes[size]} className="animate-pulse" />
      <span className="font-medium">~{estimatedMinutes} min</span>
      {isLong && (
        <span className="text-xs text-muted-foreground">
          (preparación)
        </span>
      )}
    </div>
  );
}
