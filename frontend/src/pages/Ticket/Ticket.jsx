import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import Button from "../../components/common/Button";
import Icon from "../../components/common/Icon/Icon";
import ErrorMessage from "../../components/common/ErrorMessage/ErrorMessage";
import Loading from "../../components/common/Loading/Loading";
import { getSaleById } from "../../services/saleServices";
import { downloadTicket } from "../../utils/ticket";
import { formatMoney, formatPercent } from "../../utils/money";
import "./Ticket.css";

/**
 * The receipt for a completed sale.
 *
 * Keyed by the sale's id in the URL rather than router state, which means the
 * ticket is deep-linkable, survives a refresh, and can be reprinted later. It
 * also makes the no-frontend-maths rule structural: this page can only render
 * numbers it just fetched from the database.
 */
export default function Ticket() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const found = await getSaleById(id);
        if (!cancelled) {
          setSale(found);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setSale(null);
          setError(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <Loading>
        <p>Cargando ticket…</p>
      </Loading>
    );
  }

  if (error?.kind === "NOT_FOUND") {
    return (
      <div className="ticket-page">
        <ErrorMessage>Venta no encontrada.</ErrorMessage>
        <Button variant="primary" onClick={() => navigate("/")}>
          <span>Volver al inicio</span>
        </Button>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="ticket-page">
        <ErrorMessage>No pudimos cargar el ticket.</ErrorMessage>
        <Button variant="secondary" onClick={() => navigate("/")}>
          <span>Volver al inicio</span>
        </Button>
      </div>
    );
  }

  const when = sale.createdAt ? new Date(sale.createdAt).toLocaleString("es-MX") : "—";

  return (
    <div className="ticket-page">
      <div className="ticket-success">
        <Icon name="checkCircle" size={56} className="success" />
        <h1>Venta registrada</h1>
      </div>

      <div className="ticket">
        <div className="ticket-head">
          <h2>Cafecito Feliz</h2>
          <p className="muted">Ticket de venta</p>
        </div>

        <dl className="ticket-meta">
          <div>
            <dt>Folio</dt>
            <dd className="ticket-folio">{sale._id}</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{when}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{sale.client?.display_name ?? "Público general"}</dd>
          </div>
        </dl>

        <table className="ticket-lines">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>P. unit.</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {/* `name` is the snapshot stored on the sale, so a deleted product
                still prints correctly. */}
            {sale.products.map((item, index) => (
              <tr key={`${item.product?._id ?? item.product ?? index}`}>
                <td>{item.name}</td>
                <td>{item.quantity}</td>
                <td>{formatMoney(item.price)}</td>
                <td>{formatMoney(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ticket-totals">
          <p>
            <span>Subtotal</span>
            <span>{formatMoney(sale.subtotal)}</span>
          </p>
          {sale.discount > 0 && (
            <p className="ticket-discount">
              <span>Descuento ({formatPercent(sale.discount)})</span>
              <span>−{formatMoney(sale.discount_amount)}</span>
            </p>
          )}
          <p className="ticket-total">
            <span>Total</span>
            <span>{formatMoney(sale.total_price)}</span>
          </p>
        </div>
      </div>

      <div className="ticket-actions">
        <Button variant="primary" onClick={() => downloadTicket(sale)}>
          <Icon name="printer" size={20} />
          <span>Imprimir ticket</span>
        </Button>
        <Button variant="secondary" onClick={() => navigate("/")}>
          <Icon name="home" size={20} />
          <span>Nueva venta</span>
        </Button>
      </div>
    </div>
  );
}
