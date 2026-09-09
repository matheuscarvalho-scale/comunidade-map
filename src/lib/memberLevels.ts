// Member levels based on points
export interface MemberLevel {
  name: string;
  minPoints: number;
  maxPoints: number | null;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const MEMBER_LEVELS: MemberLevel[] = [
  {
    name: "Bronze",
    minPoints: 0,
    maxPoints: 100,
    icon: "🥉",
    color: "text-amber-700",
    bgColor: "bg-amber-700/20",
    borderColor: "border-amber-700/30",
  },
  {
    name: "Prata",
    minPoints: 101,
    maxPoints: 300,
    icon: "🥈",
    color: "text-slate-400",
    bgColor: "bg-slate-400/20",
    borderColor: "border-slate-400/30",
  },
  {
    name: "Ouro",
    minPoints: 301,
    maxPoints: 700,
    icon: "🥇",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/30",
  },
  {
    name: "Diamante",
    minPoints: 701,
    maxPoints: null,
    icon: "💎",
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/20",
    borderColor: "border-cyan-400/30",
  },
];

export function getMemberLevel(points: number): MemberLevel {
  for (let i = MEMBER_LEVELS.length - 1; i >= 0; i--) {
    if (points >= MEMBER_LEVELS[i].minPoints) {
      return MEMBER_LEVELS[i];
    }
  }
  return MEMBER_LEVELS[0];
}

export function getNextLevel(points: number): MemberLevel | null {
  const currentLevel = getMemberLevel(points);
  const currentIndex = MEMBER_LEVELS.findIndex((l) => l.name === currentLevel.name);
  if (currentIndex < MEMBER_LEVELS.length - 1) {
    return MEMBER_LEVELS[currentIndex + 1];
  }
  return null;
}

export function getProgressToNextLevel(points: number): number {
  const currentLevel = getMemberLevel(points);
  const nextLevel = getNextLevel(points);
  
  if (!nextLevel) return 100; // Already at max level
  
  const pointsInCurrentLevel = points - currentLevel.minPoints;
  const pointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints;
  
  return Math.min((pointsInCurrentLevel / pointsNeededForNextLevel) * 100, 100);
}
