import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useCart } from "../../context/CartContext";
import CartView from "../../components/Cart/CartView";
import Button from "../../components/common/Button";
import Icon from "../../components/common/Icon/Icon";
import ErrorMessage from "../../components/common/ErrorMessage/ErrorMessage";
import { quoteSale } from "../../services/saleServices";
import { cartToItems } from "../../utils/cart";
import { formatMoney } from "../../utils/money";
import "./Cart.css";

/**
 * Review screen before checkout.
 *
 * The running total is fetched from the backend rather than summed locally, so
 * what the cashier reads here is the same figure the sale will use. No client is
 * attached at this stage, so no loyalty discount is shown yet — that happens on
 * the checkout screen once a customer is identified.
 */
export default function Cart() {
  const { cartItems, clearCart, getTotalItems } = useCart();
  const navigate = useNavigate();

  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);

  const totalItems = getTotalItems();

  useEffect(() => {
    if (cartItems.length === 0) {
      setQuote(null);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const next = await quoteSale({ items: cartToItems(cartItems) });
        if (!cancelled) {
          setQuote(next);
          setQuoteError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setQuote(null);
          setQuoteError(error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cartItems]);

  if (cartItems.length === 0) {
    return (
      <div className="cart-empty">
        <Icon name="cart" size={100} />
        <h2>El carrito está vacío</h2>
        <p>Agrega productos para comenzar una venta.</p>
        <Button variant="primary" onClick={() => navigate("/")}>
          <span>Ver productos</span>
        </Button>
      </div>
    );
  }

  const stockProblem =
    quoteError?.kind === "CONFLICT" ? quoteError.original?.response?.data : null;

  return (
    <div className="cart">
      <div className="cart-header">
        <div className="cart-header-title">
          <Icon name="cart" size={32} />
          <h1>Carrito</h1>
        </div>
        <div className="cart-header-info">
          <span className="cart-items-count">
            {totalItems} {totalItems === 1 ? "producto" : "productos"}
          </span>
          <Button
            variant="ghost"
            className="danger clear-cart-btn"
            onClick={clearCart}
            title="Vaciar carrito"
            size="sm"
          >
            <Icon name="trash" size={18} />
            <span>Vaciar</span>
          </Button>
        </div>
      </div>

      {stockProblem && (
        <ErrorMessage>
          <div>
            <strong>Sin suficiente inventario:</strong>
            <ul>
              {(stockProblem.details ?? []).map((d) => (
                <li key={d.product}>
                  {d.name}: se piden {d.requested}, hay {d.available}
                </li>
              ))}
            </ul>
          </div>
        </ErrorMessage>
      )}

      {quoteError && !stockProblem && (
        <ErrorMessage>
          No pudimos calcular el total. Revisa tu conexión e intenta de nuevo.
        </ErrorMessage>
      )}

      <div className="cart-items">
        <CartView quote={quote} />

        <div className="cart-summary">
          <div className="cart-total">
            <span className="cart-total-subtitle">Total</span>
            {/* Straight from the server. "—" while the quote is in flight. */}
            <h2>{quote ? formatMoney(quote.total_price) : "—"}</h2>
          </div>
          <div className="cart-actions">
            <Button variant="secondary" size="md" onClick={() => navigate("/")}>
              <span>Seguir agregando</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate("/checkout")}
              disabled={!quote}
              title={
                quote
                  ? "Continuar al cobro"
                  : "Esperando el total del servidor"
              }
            >
              <Icon name="creditCard" size={20} />
              <span>Continuar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
