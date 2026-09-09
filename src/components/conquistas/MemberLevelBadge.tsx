import { getMemberLevel, getNextLevel, getProgressToNextLevel } from "@/lib/memberLevels";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MemberLevelBadgeProps {
  points: number;
  showProgress?: boolean;
  size?: "sm" | "md" | "lg";
}

export function MemberLevelBadge({ points, showProgress = false, size = "md" }: MemberLevelBadgeProps) {
  const level = getMemberLevel(points);
  const nextLevel = getNextLevel(points);
  const progress = getProgressToNextLevel(points);

  const sizeClasses = {
    sm: "text-sm px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const iconSizes = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="inline-flex flex-col items-center gap-1">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border ${level.bgColor} ${level.borderColor} ${level.color} ${sizeClasses[size]} font-medium`}
          >
            <span className={iconSizes[size]}>{level.icon}</span>
            <span>{level.name}</span>
          </div>
          {showProgress && nextLevel && (
            <div className="w-full max-w-[120px]">
              <Progress value={progress} className="h-1.5" />
              <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                {points}/{nextLevel.minPoints} pts
              </p>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <p className="font-medium">Nível {level.name}</p>
          <p className="text-sm text-muted-foreground">{points} pontos</p>
          {nextLevel && (
            <p className="text-xs text-muted-foreground">
              Faltam {nextLevel.minPoints - points} pts para {nextLevel.name}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
