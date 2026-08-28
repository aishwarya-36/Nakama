// "other" reveals a free-text field in the UI instead of a fixed label.
export const EXPENSE_CATEGORIES = [
  { key: "food", label: "Food" },
  { key: "movie", label: "Movie" },
  { key: "transport", label: "Transport" },
  { key: "shopping", label: "Shopping" },
  { key: "home", label: "Home" },
  { key: "travel", label: "Travel" },
  { key: "utilities", label: "Utilities" },
  { key: "other", label: "Other" },
] as const;

export type CategoryKey = (typeof EXPENSE_CATEGORIES)[number]["key"];

export const CATEGORY_COLOR_VAR: Record<string, string> = {
  food: "--color-cat-food",
  movie: "--color-cat-movie",
  transport: "--color-cat-transport",
  shopping: "--color-cat-shopping",
  home: "--color-cat-home",
  travel: "--color-cat-travel",
  utilities: "--color-cat-utilities",
  other: "--color-cat-other",
};
