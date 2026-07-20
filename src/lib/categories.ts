export interface CategoryDef {
  key: string;
  label: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: "tamilnadu", label: "தமிழகம்" },
  { key: "india", label: "இந்தியா" },
  { key: "world", label: "உலகம்" },
  { key: "sports", label: "விளையாட்டு" },
  { key: "cinema", label: "சினிமா" },
];

export const NAV_ITEMS = [{ key: "", label: "முகப்பு" }, ...CATEGORIES];

export function getCategoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export function isValidCategory(key: string): boolean {
  return CATEGORIES.some((c) => c.key === key);
}
