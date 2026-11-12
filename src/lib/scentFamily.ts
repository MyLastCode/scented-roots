// Groups a fragrance into the Collection filter families shown in Figma.
// Uses catalog accords when present, otherwise falls back to the free-text
// notes, so fragrances added manually still get sorted.

export type ScentFamily = "woody" | "fresh" | "sweet";

export const SCENT_FAMILIES: {
  key: ScentFamily;
  label: string;
  dotColor: string;
}[] = [
  { key: "woody", label: "Woody", dotColor: "#8A5A3B" },
  { key: "fresh", label: "Fresh", dotColor: "#6FA8DC" },
  { key: "sweet", label: "Sweet", dotColor: "#E58AA3" },
];

const KEYWORDS: Record<ScentFamily, string[]> = {
  woody: [
    "wood", "cedar", "sandal", "vetiver", "oud", "agarwood", "patchouli",
    "guaiac", "birch", "cypress", "pine", "oakmoss", "moss", "leather",
    "tobacco", "smoky", "earthy", "amber", "incense",
  ],
  fresh: [
    "fresh", "citrus", "bergamot", "lemon", "lime", "grapefruit", "orange",
    "mandarin", "neroli", "aquatic", "marine", "ozonic", "sea", "mint",
    "green", "herbal", "lavender", "aromatic", "ginger", "tea",
  ],
  sweet: [
    "sweet", "vanilla", "tonka", "caramel", "honey", "praline", "chocolate",
    "cocoa", "coffee", "sugar", "gourmand", "almond", "cherry", "fruity",
    "berry", "benzoin", "musk", "rose", "floral", "jasmine",
  ],
};

export function scentFamiliesOf(fragrance: {
  notes?: string;
  accords?: string[];
}): Set<ScentFamily> {
  const text = [...(fragrance.accords ?? []), fragrance.notes ?? ""]
    .join(" ")
    .toLowerCase();
  const families = new Set<ScentFamily>();
  for (const { key } of SCENT_FAMILIES) {
    if (KEYWORDS[key].some((word) => text.includes(word))) families.add(key);
  }
  return families;
}
