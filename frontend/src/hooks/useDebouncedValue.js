import { useEffect, useState } from "react";

/**
 * Returns `value` after it has stopped changing for `delay` ms.
 *
 * Used by the client picker so typing a name issues one request when the cashier
 * pauses, rather than one per keystroke.
 *
 *   const debounced = useDebouncedValue(query, 300);
 *   useEffect(() => { search(debounced); }, [debounced]);
 */
export default function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    // Clearing on every change is what makes this a debounce rather than a
    // throttle: a new keystroke cancels the pending update.
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
