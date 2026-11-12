// Tokens mirror the "Theme Light" / "Theme Dark" variable collections in Figma.
// MERGE into your existing theme.ts: keep your export names, add `onAccent`,
// and update the values if you want the new palette.

export type ThemeColors = {
  background: string;
  card: string;
  text: string;
  secondaryText: string;
  tertiaryText: string;
  border: string;
  divider: string;
  accent: string;
  accentBackground: string;
  error: string;
  placeholder: string;
  placeholderText: string;
  inputBackground: string;
  onAccent: string; // text/icon color on top of `accent`
};

export const lightColors: ThemeColors = {
  background: "#FAF6F0",
  card: "#FFFFFF",
  text: "#1C1714",
  secondaryText: "#6B6158",
  tertiaryText: "#A0958A",
  border: "#E3DACE",
  divider: "#EBE3D8",
  accent: "#A8512F",
  accentBackground: "#F5E4D9",
  error: "#C0392B",
  placeholder: "#EBE3D8",
  placeholderText: "#8A8077",
  inputBackground: "#FFFFFF",
  onAccent: "#FFFFFF",
};

export const darkColors: ThemeColors = {
  background: "#14110F",
  card: "#1F1A17",
  text: "#F6F0E8",
  secondaryText: "#B9AEA2",
  tertiaryText: "#7F756A",
  border: "#3B332C",
  divider: "#2B241F",
  accent: "#E39A70",
  accentBackground: "#3A2418",
  error: "#FF7A6B",
  placeholder: "#2B241F",
  placeholderText: "#9A8F84",
  inputBackground: "#1F1A17",
  onAccent: "#1C1714",
};

export const radii = { sm: 8, md: 10, lg: 12, xl: 16, pill: 28 } as const;

// Fallback gradients for fragrances/avatars with no photo.
export const gradients = [
  ["#10243F", "#6FA8DC"],
  ["#5A2A14", "#E8A15C"],
  ["#6B1F3A", "#F2A7B8"],
  ["#1E120C", "#8A5A3B"],
  ["#1F4A3A", "#B7D8B0"],
  ["#2E1F4D", "#C3A6E6"],
] as const;

// Same seed -> same gradient, so a given user/fragrance always looks the same.
export function gradientFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return gradients[Math.abs(hash) % gradients.length];
}
