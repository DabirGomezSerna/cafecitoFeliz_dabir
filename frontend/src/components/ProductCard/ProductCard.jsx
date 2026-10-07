import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import Badge from "../common/Badge";
import Button from "../common/Button";
import { formatMoney } from "../../utils/money";
import "./ProductCard.css";

/**
 * One product on the menu.
 *
 * The title is plain text: there is no product detail page, because a cashier taps
 * a product to add it rather than reading about it.
 *
 * Adding to the cart is only offered to signed-in staff. The menu itself is public
 * so anyone can read it, but ringing up a sale is not something a customer does,
 * and an "add to cart" button that dead-ends at a login screen would be worse than
 * no button at all.
 */
export default function ProductCard({ product, orientation = "vertical" }) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  if (!product) {
    return (
      <div className="product-card" style={{ padding: "24px", textAlign: "center" }}>
        <p className="muted">Producto no disponible</p>
      </div>
    );
  }

  const { name, price, stock, description } = product;

  const inStock = stock > 0;
  const stockBadge = inStock
    ? { text: `En stock: ${stock}`, variant: "success" }
    : { text: "Agotado", variant: "error" };

  return (
    <div className={`product-card product-card--${orientation}`}>
      <div className="product-card-content">
        <h3 className="product-card-title">{name}</h3>
        {description && (
          <p className="muted product-card-description">
            {description.length > 60
              ? `${description.substring(0, 60)}...`
              : description}
          </p>
        )}
        {/* The server's price, formatted. No arithmetic. */}
        <div className="product-card-price">{formatMoney(price)}</div>
      </div>

      <div className="product-card-actions">
        <Badge text={stockBadge.text} variant={stockBadge.variant} />

        {isAuthenticated && (
          <Button
            variant="primary"
            size="sm"
            disabled={!inStock}
            onClick={() => addToCart(product, 1)}
            title={inStock ? `Agregar ${name} al carrito` : "Sin inventario"}
          >
            Agregar
          </Button>
        )}
      </div>
    </div>
  );
}
