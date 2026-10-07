/**
 * Translate cart state into the wire format the sales API expects.
 *
 * Note what is NOT sent: no prices. The backend looks every price up itself, so
 * including one here would be ignored at best and misleading at worst. Sending
 * only ids and quantities is what makes the server the single pricing authority.
 */
export const cartToItems = (cartItems) =>
  (cartItems ?? []).map((item) => ({
    product: item._id,
    quantity: item.quantity,
  }));

/** Look up a priced quote line for a cart item, so the UI can show its money. */
export const findQuoteLine = (quote, productId) =>
  quote?.lines?.find((line) => line.product === productId) ?? null;
