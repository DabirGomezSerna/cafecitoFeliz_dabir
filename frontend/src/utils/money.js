/**
 * Currency formatting — presentation only.
 *
 * This file formats numbers the backend already calculated. It must never do
 * arithmetic: no multiplying, summing, or applying percentages. If you find
 * yourself wanting a helper here that takes two numbers, the calculation belongs
 * in the backend's pricing service instead.
 */

const formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

/** Format a server-provided amount as Mexican pesos. */
export const formatMoney = (value) =>
  formatter.format(Number.isFinite(Number(value)) ? Number(value) : 0);

/** Render a server-provided rate (0.05) as a percentage label ("5%"). */
export const formatPercent = (rate) => {
  const n = Number(rate);
  if (!Number.isFinite(n)) return "0%";
  // Multiplying by 100 is a unit conversion for display, not a price calculation.
  return `${Number((n * 100).toFixed(2))}%`;
};
