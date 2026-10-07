import { useCart } from "../../context/CartContext";
import Button from "../common/Button";
import Icon from "../common/Icon/Icon";
import { formatMoney } from "../../utils/money";
import { findQuoteLine } from "../../utils/cart";

/**
 * The cart's line items.
 *
 * Money is read from `quote` — the backend's pricing response — and never
 * computed here. When no quote is available yet (still loading, or the quote
 * failed) the amounts are simply omitted rather than estimated locally: showing a
 * number the server did not produce is exactly what this design forbids.
 *
 * @param {object} props
 * @param {?object} props.quote     response from POST /api/sales/quote
 * @param {boolean} props.readOnly  hide the quantity and remove controls
 */
export default function CartView({ quote = null, readOnly = false }) {
  const { cartItems, removeFromCart, updateQuantity } = useCart();

  return (
    <div className="cart-view">
      <div className="cart-view-header">
        <h2>
          {cartItems.length} {cartItems.length === 1 ? "producto" : "productos"}
        </h2>
      </div>

      {cartItems.map((item) => {
        const line = findQuoteLine(quote, item._id);

        return (
          <div className="cart-item" key={item._id}>
            <div className="cart-item-info">
              <h3>{item.name}</h3>
              {/* Unit price from the server's quote line. */}
              {line && (
                <p className="cart-item-price">{formatMoney(line.unit_price)}</p>
              )}
            </div>

            {readOnly ? (
              <div className="cart-item-quantity">
                <span>x{item.quantity}</span>
              </div>
            ) : (
              <div className="cart-item-quantity">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => updateQuantity(item._id, item.quantity - 1)}
                  title="Quitar uno"
                  aria-label={`Quitar uno de ${item.name}`}
                >
                  <Icon name="minus" size={15} />
                </Button>
                <span>{item.quantity}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  title="Agregar uno"
                  aria-label={`Agregar uno de ${item.name}`}
                >
                  <Icon name="plus" size={15} />
                </Button>
              </div>
            )}

            {/* Line total from the server, not price x quantity. */}
            <div className="cart-item-total">
              {line ? formatMoney(line.line_total) : "—"}
            </div>

            {!readOnly && (
              <Button
                variant="ghost"
                className="danger"
                size="sm"
                onClick={() => removeFromCart(item._id)}
                title="Quitar del carrito"
                aria-label={`Quitar ${item.name} del carrito`}
              >
                <Icon name="trash" size={16} />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
