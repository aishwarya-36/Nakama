// Standard expense categories shown as icon buttons in the Add Expense modal.
// "other" is special-cased in the UI: picking it reveals a text field, and
// whatever's typed there is stored as the category value directly.
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

// Maps each category to its chart color CSS variable (defined in globals.css,
// light + dark) — fixed hue order, shared by every place that colors categories.
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
