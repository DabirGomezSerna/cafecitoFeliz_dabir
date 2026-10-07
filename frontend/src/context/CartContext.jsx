import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(undefined);

const STORAGE_KEY = "cart";

/**
 * The cart holds WHAT is being bought — nothing about what it costs.
 *
 * There is deliberately no total here. Every monetary figure comes from the
 * backend's POST /api/sales/quote, because the server is the only thing allowed
 * to price a sale. An earlier version of this file exposed getTotalPrice() and a
 * duplicate calculateTotal(), which meant the screen could disagree with the
 * actual charge and could not account for the loyalty discount at all.
 *
 * Items keep the product fields for display (name, stock), but the price on a
 * cart item is never summed here — see utils/cart.js for what gets sent.
 */
export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      // Private browsing, blocked storage, or corrupt JSON — start empty rather
      // than taking the whole app down over a cached cart.
      return [];
    }
  });

  // Persisted so a reload mid-order does not lose the sale in progress. The
  // matching requirement is that completing or abandoning a sale clears it: see
  // clearCart, called after a committed sale and on logout.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cartItems));
    } catch {
      // Not fatal: the cart still works for this session.
    }
  }, [cartItems]);

  const removeFromCart = (productId) => {
    setCartItems((prev) => prev.filter((item) => item._id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item._id === productId ? { ...item, quantity: newQuantity } : item,
      ),
    );
  };

  const addToCart = (product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item._id === product._id);

      if (existing) {
        return prev.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + quantity }
            : item,
        );
      }

      return [...prev, { ...product, quantity }];
    });
  };

  const clearCart = () => setCartItems([]);

  /** Number of units in the cart. A count, not money. */
  const getTotalItems = () =>
    cartItems.reduce((total, item) => total + item.quantity, 0);

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalItems,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}

export default CartContext;
