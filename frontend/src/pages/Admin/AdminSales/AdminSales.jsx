import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Icon from "../../../components/common/Icon/Icon";
import ErrorMessage from "../../../components/common/ErrorMessage/ErrorMessage";
import Loading from "../../../components/common/Loading/Loading";
import { listSales } from "../../../services/saleServices";
import { formatMoney, formatPercent } from "../../../utils/money";
import "../admin.css";
import "./AdminSales.css";

/**
 * Sales history, newest first. Admin only — a vendor receives 403 from the API
 * and never reaches this screen, because the route is role-gated too.
 *
 * Every amount shown is read straight from the stored sale. There is deliberately
 * no revenue roll-up here: summing totals would be money arithmetic on the client,
 * which is the one thing this codebase does not do. If a daily total is wanted, the
 * backend should compute and return it.
 */
export default function AdminSales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const data = await listSales();
        if (!cancelled) {
          setSales(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="admin-page">
        <Loading>
          <p>Cargando ventas…</p>
        </Loading>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <ErrorMessage>
          {error.kind === "FORBIDDEN"
            ? "Solo los administradores pueden ver el historial de ventas."
            : "No pudimos cargar las ventas."}
        </ErrorMessage>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>
          <Icon name="fileText" size={28} />
          <span>Ventas</span>
        </h1>
        <p className="muted">
          {sales.length} {sales.length === 1 ? "venta registrada" : "ventas registradas"}
        </p>
      </header>

      {sales.length === 0 ? (
        <p className="muted">Todavía no hay ventas registradas.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Productos</th>
                <th>Subtotal</th>
                <th>Desc.</th>
                <th>Total</th>
                <th>Ticket</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale._id}>
                  <td className="nowrap">
                    {new Date(sale.createdAt).toLocaleString("es-MX")}
                  </td>
                  <td>{sale.client?.display_name ?? "Público general"}</td>
                  <td>
                    <ul className="sale-lines">
                      {sale.products.map((item, i) => (
                        <li key={`${sale._id}-${i}`}>
                          {item.quantity} × {item.name}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="nowrap">{formatMoney(sale.subtotal)}</td>
                  <td className="nowrap">
                    {sale.discount > 0 ? (
                      <span className="sale-discount">
                        {formatPercent(sale.discount)}
                        <br />−{formatMoney(sale.discount_amount)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="nowrap">
                    <strong>{formatMoney(sale.total_price)}</strong>
                  </td>
                  <td>
                    <Link to={`/ticket/${sale._id}`} title="Ver ticket">
                      <Icon name="fileText" size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
