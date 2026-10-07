import { useCallback, useEffect, useState } from "react";

import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Icon from "../../../components/common/Icon/Icon";
import ErrorMessage from "../../../components/common/ErrorMessage/ErrorMessage";
import Loading from "../../../components/common/Loading/Loading";
import {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../../services/productServices";
import { formatMoney } from "../../../utils/money";
import "../admin.css";
import "./AdminProducts.css";

const EMPTY_FORM = { name: "", description: "", price: "", stock: "" };

/**
 * The admin's product management screen — the first step of the daily routine:
 * put up the day's menu.
 *
 * Prices and stock are sent as numbers and read back from the server's response,
 * so this screen never holds a locally computed figure.
 */
export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [confirmingDelete, setConfirmingDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data);
      setLoadError(null);
    } catch (error) {
      setLoadError(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFieldErrors({});
    setSaveError(null);
  };

  const startEdit = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      stock: String(product.stock),
    });
    setFieldErrors({});
    setSaveError(null);
  };

  const validate = (values) => {
    const errors = {};

    if (!values.name.trim()) errors.name = "El nombre es requerido";

    const price = Number(values.price);
    if (values.price === "" || !Number.isFinite(price)) {
      errors.price = "El precio es requerido";
    } else if (price < 0) {
      errors.price = "El precio no puede ser negativo";
    }

    const stock = Number(values.stock);
    if (values.stock === "" || !Number.isFinite(stock)) {
      errors.stock = "El inventario es requerido";
    } else if (!Number.isInteger(stock) || stock < 0) {
      errors.stock = "El inventario debe ser un entero de 0 o más";
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return; // guards a double submit

    const errors = validate(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaveError(null);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock),
    };

    try {
      if (editingId) {
        await updateProduct(editingId, payload);
      } else {
        await createProduct(payload);
      }
      resetForm();
      await load();
    } catch (error) {
      setSaveError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product) => {
    try {
      await deleteProduct(product._id);
      setConfirmingDelete(null);
      if (editingId === product._id) resetForm();
      await load();
    } catch (error) {
      setSaveError(error);
      setConfirmingDelete(null);
    }
  };

  const validationDetails = saveError?.original?.response?.data?.details;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>
          <Icon name="package" size={28} />
          <span>Productos</span>
        </h1>
        <p className="muted">Gestiona el menú del día.</p>
      </header>

      <section className="admin-form-card">
        <h2>{editingId ? "Editar producto" : "Nuevo producto"}</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="admin-form-grid">
            <div>
              <Input
                id="product-name"
                label="Nombre *"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Cafe Mocha"
              />
              {fieldErrors.name && (
                <span className="field-error">{fieldErrors.name}</span>
              )}
            </div>

            <div>
              <Input
                id="product-price"
                label="Precio *"
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                placeholder="0.00"
              />
              {fieldErrors.price && (
                <span className="field-error">{fieldErrors.price}</span>
              )}
            </div>

            <div>
              <Input
                id="product-stock"
                label="Inventario *"
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
                placeholder="0"
              />
              {fieldErrors.stock && (
                <span className="field-error">{fieldErrors.stock}</span>
              )}
            </div>

            <div className="admin-form-wide">
              <Input
                id="product-description"
                label="Descripción"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Cafe mocha clasico."
              />
            </div>
          </div>

          {saveError && (
            <ErrorMessage>
              {Array.isArray(validationDetails) && validationDetails.length > 0 ? (
                <ul>
                  {validationDetails.map((d) => (
                    <li key={d.path}>{d.msg}</li>
                  ))}
                </ul>
              ) : (
                "No pudimos guardar el producto."
              )}
            </ErrorMessage>
          )}

          <div className="admin-form-actions">
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "Guardando…" : editingId ? "Guardar cambios" : "Crear producto"}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </section>

      <section>
        <h2>Menú actual ({products.length})</h2>

        {loading && (
          <Loading>
            <p>Cargando productos…</p>
          </Loading>
        )}

        {loadError && <ErrorMessage>No pudimos cargar los productos.</ErrorMessage>}

        {!loading && !loadError && products.length === 0 && (
          <p className="muted">Todavía no hay productos. Crea el primero arriba.</p>
        )}

        {products.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Inventario</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <strong>{product.name}</strong>
                      {product.description && (
                        <div className="muted admin-table-sub">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td>{formatMoney(product.price)}</td>
                    <td>
                      <span
                        className={product.stock === 0 ? "stock-out" : undefined}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td className="admin-row-actions">
                      {confirmingDelete === product._id ? (
                        <>
                          <span className="muted">¿Eliminar?</span>
                          <Button
                            variant="ghost"
                            className="danger"
                            size="sm"
                            onClick={() => handleDelete(product)}
                          >
                            Sí
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setConfirmingDelete(null)}
                          >
                            No
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => startEdit(product)}
                            title={`Editar ${product.name}`}
                          >
                            <Icon name="edit" size={16} />
                            <span>Editar</span>
                          </Button>
                          <Button
                            variant="ghost"
                            className="danger"
                            size="sm"
                            onClick={() => setConfirmingDelete(product._id)}
                            title={`Eliminar ${product.name}`}
                          >
                            <Icon name="trash" size={16} />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
