/** Store currency as integer cents to avoid floating-point rounding in totals. */
export function invoiceTotal(items) {
  return items.reduce((total, item) => {
    if (!Number.isSafeInteger(item.priceCents) || item.priceCents < 0
      || !Number.isSafeInteger(item.quantity) || item.quantity < 0) {
      throw new TypeError("Prices and quantities must be non-negative integers");
    }
    const next = total + item.priceCents * item.quantity;
    if (!Number.isSafeInteger(next)) throw new RangeError("Invoice total exceeds the safe integer range");
    return next;
  }, 0);
}
