const EXPENSES_CHANGED = "nakama:expenses-changed";
const SETTLEMENT_CHANGED = "nakama:settlement-changed";

export function emitExpensesChanged() {
  window.dispatchEvent(new Event(EXPENSES_CHANGED));
}

export function emitSettlementChanged() {
  window.dispatchEvent(new Event(SETTLEMENT_CHANGED));
}

export function onExpensesChanged(callback: () => void) {
  window.addEventListener(EXPENSES_CHANGED, callback);
  return () => window.removeEventListener(EXPENSES_CHANGED, callback);
}

export function onSettlementChanged(callback: () => void) {
  window.addEventListener(SETTLEMENT_CHANGED, callback);
  return () => window.removeEventListener(SETTLEMENT_CHANGED, callback);
}
