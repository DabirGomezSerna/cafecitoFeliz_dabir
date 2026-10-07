/**
 * Round to 2 decimal places (centavos).
 *
 * Money here is stored as a Number, so binary floating point applies:
 * 0.1 + 0.2 === 0.30000000000000004, and 149.99 * 3 === 449.96999999999997.
 * Every intermediate monetary result must pass through this function, or those
 * trailing digits accumulate and a ticket total ends up a centavo off what the
 * lines add up to.
 *
 * `+(x).toFixed(2)` is used rather than Math.round(x * 100) / 100 because the
 * latter mis-rounds some halfway values (Math.round(1.005 * 100) === 100).
 *
 * Note this is round-half-away-from-zero on the decimal string, which is what
 * a cash register is expected to do. If this project ever needs exact decimal
 * arithmetic (multi-currency, tax authorities), the right move is integer
 * centavos or a decimal library, not more rounding here.
 */
const round2 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(2));
};

export default round2;
