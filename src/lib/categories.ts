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
