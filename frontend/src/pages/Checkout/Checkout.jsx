import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import CartView from "../../components/Cart/CartView";
import ClientPicker from "../../components/Sale/ClientPicker/ClientPicker";
import SummarySection from "../../components/Checkout/SummarySection/SummarySection";
import Button from "../../components/common/Button";
import ErrorMessage from "../../components/common/ErrorMessage/ErrorMessage";
import Icon from "../../components/common/Icon/Icon";
import { useCart } from "../../context/CartContext";
import { quoteSale, createSale } from "../../services/saleServices";
import { cartToItems } from "../../utils/cart";
import { formatMoney, formatPercent } from "../../utils/money";
import "./Checkout.css";

/**
 * The sale screen.
 *
 * Two steps: identify the customer (optional), then confirm. There is no shipping
 * address, no tax line and no delivery estimate — this is an in-store café till,
 * and those were inherited from the e-commerce project this UI came from.
 *
 * Every monetary figure on this page comes from `quote`, the backend's response to
 * POST /api/sales/quote. Nothing here multiplies or sums money.
 */
export default function Checkout() {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();

  const [selectedClient, setSelectedClient] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const [clientSectionOpen, setClientSectionOpen] = useState(true);

  /**
   * Set once the sale is committed.
   *
   * clearCart() empties the cart, which re-runs the empty-cart redirect below and
   * would race the navigation to the ticket. A ref rather than state because the
   * guard must see the new value immediately, in the same tick — the previous
   * implementation used state and then omitted it from the dependency array, so it
   * always read a stale value.
   */
  const submittedRef = useRef(false);

  // An empty cart means there is nothing to sell; go back and pick something.
  useEffect(() => {
    if (!submittedRef.current && cartItems.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [cartItems, navigate]);

  /**
   * Re-price whenever the cart or the customer changes.
   *
   * Selecting a client re-quotes, so the loyalty discount appears immediately and
   * is computed by the server from that client's stored purchase count. The
   * cashier sees the real number before committing to anything.
   */
  useEffect(() => {
    if (cartItems.length === 0) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const next = await quoteSale({
          items: cartToItems(cartItems),
          client: selectedClient?._id ?? null,
        });
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
  }, [cartItems, selectedClient]);

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setSubmitError(null);
    // Collapse once a decision is made — including "no client", which is a real
    // choice rather than an absence of one.
    setClientSectionOpen(false);
  };

  const handleConfirmSale = async () => {
    // Guards a double click and React 19's StrictMode double-invocation. Without
    // it a second POST would decrement stock and bump loyalty twice.
    if (submitting || !quote) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const sale = await createSale({
        items: cartToItems(cartItems),
        client: selectedClient?._id ?? null,
        // The total the cashier is looking at. If it no longer matches, the
        // server refuses rather than charging a different amount.
        expected_total: quote.total_price,
      });

      submittedRef.current = true;
      clearCart();
      navigate(`/ticket/${sale._id}`, { replace: true });
    } catch (error) {
      setSubmitError(error);
    } finally {
      setSubmitting(false);
    }
  };

  const errorBody = (error) => error?.original?.response?.data ?? null;

  const renderSaleError = (error) => {
    const body = errorBody(error);
    const code = body?.code;

    if (code === "INSUFFICIENT_STOCK") {
      return (
        <ErrorMessage>
          <div>
            <strong>Sin suficiente inventario:</strong>
            <ul>
              {(body.details ?? []).map((d) => (
                <li key={d.product}>
                  {d.name}: se piden {d.requested}
                  {d.available !== undefined ? `, hay ${d.available}` : ""}
                </li>
              ))}
            </ul>
            Ajusta el carrito e intenta de nuevo.
          </div>
        </ErrorMessage>
      );
    }

    if (code === "PRICE_CHANGED") {
      return (
        <ErrorMessage>
          Los precios cambiaron mientras preparabas la venta. El total ahora es{" "}
          {formatMoney(body.details?.current)}. Revisa y confirma de nuevo.
        </ErrorMessage>
      );
    }

    if (error?.kind === "NETWORK" || error?.kind === "TIMEOUT") {
      return (
        <ErrorMessage>
          No pudimos conectar con el servidor. La venta no se registró.
        </ErrorMessage>
      );
    }

    return (
      <ErrorMessage>
        No pudimos completar la venta. La venta no se registró.
      </ErrorMessage>
    );
  };

  const clientSummary = selectedClient ? (
    <div className="selected-client">
      <p>{selectedClient.display_name}</p>
      <p className="muted">{selectedClient.email}</p>
    </div>
  ) : (
    <div className="selected-client">
      <p>Venta sin cliente</p>
    </div>
  );

  return (
    <div className="checkout-container">
      <div className="checkout-left">
        <SummarySection
          title="1. Cliente (opcional)"
          selected={true}
          summaryContent={clientSummary}
          isExpanded={clientSectionOpen}
          onToggle={() => setClientSectionOpen((open) => !open)}
        >
          <ClientPicker
            selectedClient={selectedClient}
            onSelect={handleSelectClient}
          />
        </SummarySection>

        <SummarySection
          title="2. Detalle de la venta"
          selected={true}
          isExpanded={true}
        >
          <CartView quote={quote} />
        </SummarySection>
      </div>

      <div className="checkout-right">
        <div className="checkout-summary">
          <h3>Resumen</h3>

          <div className="summary-details">
            <p>
              <strong>Cliente: </strong>
              {selectedClient ? selectedClient.display_name : "Público general"}
            </p>

            {quoteError && (
              <ErrorMessage>
                No pudimos calcular el total. Revisa el inventario o tu conexión.
              </ErrorMessage>
            )}

            {submitError && renderSaleError(submitError)}

            {/* Three rows, all server-provided: no tax, no shipping, no estimate. */}
            <div className="order-costs">
              <p>
                <strong>Subtotal: </strong>
                {quote ? formatMoney(quote.subtotal) : "—"}
              </p>

              {quote && quote.discount_rate > 0 && (
                <p className="discount-row">
                  <strong>
                    Descuento ({formatPercent(quote.discount_rate)}):{" "}
                  </strong>
                  −{formatMoney(quote.discount_amount)}
                </p>
              )}

              <p className="total-row">
                <strong>Total: </strong>
                {quote ? formatMoney(quote.total_price) : "—"}
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              disabled={!quote || submitting || cartItems.length === 0}
              title={
                !quote
                  ? "Esperando el total del servidor"
                  : submitting
                    ? "Registrando la venta…"
                    : "Registrar la venta"
              }
              onClick={handleConfirmSale}
            >
              <Icon name="checkCircle" size={20} />
              <span>{submitting ? "Registrando…" : "Cobrar"}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
