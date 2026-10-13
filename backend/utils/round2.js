/**
 * Round to 2 decimal places (centavos).
 *
 * Money here is stored as a Number, so binary floating point applies:
 * 0.1 + 0.2 === 0.30000000000000004, and 1.1 * 3 === 3.3000000000000003. Every
 * intermediate monetary result must pass through this function, or those trailing
 * digits accumulate and a ticket total ends up a centavo off what its lines add
 * up to.
 *
 * The Number() wrapper is load-bearing, not cosmetic: toFixed returns a STRING,
 * so `sum += x.toFixed(2)` concatenates digits rather than adding them, and
 * Mongoose would cast the resulting numeric string without complaint — storing a
 * silently wrong total. The Number.isFinite guard is equally deliberate, since
 * undefined.toFixed(2) throws and NaN.toFixed(2) yields "NaN"; either would
 * otherwise reach total_price on a persisted sale.
 *
 * Number(x.toFixed(2)) is preferred over Math.round(x * 100) / 100 because the
 * two disagree whenever a decimal LOOKS like a halfway case but its stored binary
 * value is not one. 2.675 is really 2.6749999999999998, so toFixed gives 2.67
 * while Math.round(267.49999...) gives 2.68. Likewise 0.615, 1.045 and 16.665.
 *
 * On a tie the binary value represents exactly — 0.125, say — toFixed rounds away
 * from zero: 0.13, and -0.125 to -0.13. That is the behaviour expected of a cash
 * register, though such exact ties are rare; in practice the binary value decides.
 * If this project ever needs true decimal arithmetic (multi-currency, tax
 * authorities), the right move is integer centavos or a decimal library, not more
 * rounding here.
 */
const round2 = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(n.toFixed(2));
};

export default round2;
