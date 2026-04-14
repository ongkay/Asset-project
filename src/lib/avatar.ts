const AVATAR_TONES = [
  "bg-primary text-primary-foreground",
  "bg-chart-1 text-white",
  "bg-chart-2 text-white",
  "bg-chart-3 text-white",
  "bg-chart-4 text-white",
  "bg-chart-5 text-white",
  "bg-sidebar-primary text-sidebar-primary-foreground",
  "bg-destructive text-white",
] as const;

export function getAvatarToneClass(seed: string) {
  if (!seed.trim()) {
    return AVATAR_TONES[0];
  }

  let hash = 0;

  for (const character of seed.trim().toLowerCase()) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
