import { useEffect, useMemo, useState } from "react";

import Button from "../../common/Button";
import Input from "../../common/Input";
import Icon from "../../common/Icon/Icon";
import ErrorMessage from "../../common/ErrorMessage/ErrorMessage";
import useDebouncedValue from "../../../hooks/useDebouncedValue";
import { searchClients, createClient } from "../../../services/clientServices";
import { formatPercent } from "../../../utils/money";
import "./ClientPicker.css";

/** Mirror of the backend's loyalty tiers, for an explanatory label only.
 *  The actual discount always comes from the server's quote. */
const tierFor = (purchases) => {
  if (purchases >= 8) return 0.15;
  if (purchases >= 4) return 0.1;
  if (purchases >= 1) return 0.05;
  return 0;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Pick the customer for a sale, or explicitly sell to nobody.
 *
 * Attaching a client is optional, but it is how the loyalty discount is applied,
 * so the picker shows each client's purchase count and the tier it implies — the
 * cashier can then explain the discount to the customer out loud.
 *
 * A new customer can be registered inline. Sending the cashier to a separate page
 * mid-queue would mean abandoning the sale in progress, so creating a client has
 * to be possible from right here.
 *
 * @param {object}   props
 * @param {?object}  props.selectedClient
 * @param {Function} props.onSelect  receives the client object, or null
 */
export default function ClientPicker({ selectedClient, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Inline creation
  const [creating, setCreating] = useState(false);
  const [newClient, setNewClient] = useState({ display_name: "", email: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [duplicate, setDuplicate] = useState(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  // Below two characters there is nothing worth asking the server about.
  const shouldSearch = debouncedQuery.trim().length >= 2;

  useEffect(() => {
    if (!shouldSearch) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    setSearching(true);

    (async () => {
      try {
        const found = await searchClients(debouncedQuery.trim());
        if (!cancelled) {
          setResults(found);
          setSearchError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setResults([]);
          setSearchError(error);
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, shouldSearch]);

  const openCreateForm = () => {
    // Carry over whatever the cashier already typed: if they searched for a name
    // and found nothing, that name is almost certainly the new customer's.
    const typed = query.trim();
    setNewClient({
      display_name: EMAIL_RE.test(typed) ? "" : typed,
      email: EMAIL_RE.test(typed) ? typed : "",
    });
    setFieldErrors({});
    setDuplicate(null);
    setCreating(true);
  };

  const validateNew = (values) => {
    const errors = {};
    if (!values.display_name.trim()) {
      errors.display_name = "El nombre es requerido";
    }
    if (!values.email.trim()) {
      errors.email = "El email es requerido";
    } else if (!EMAIL_RE.test(values.email.trim())) {
      errors.email = "El email no tiene un formato válido";
    }
    return errors;
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    const errors = validateNew(newClient);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setDuplicate(null);
    setSaving(true);

    try {
      const created = await createClient({
        display_name: newClient.display_name.trim(),
        email: newClient.email.trim(),
      });

      // Select immediately so the sale continues without a second lookup. This
      // re-quotes, and a brand-new client shows 0% — correct, since the discount
      // is based on purchases before this sale.
      onSelect(created);
      setCreating(false);
      setQuery("");
    } catch (error) {
      /**
       * The email is already on file. That usually means this is a returning
       * customer whose name was spelled differently, so the search missed them.
       *
       * Offering the existing record matters: the alternative is a dead end,
       * where the fastest escape under queue pressure is an anonymous sale — and
       * the customer silently loses the discount they had earned.
       */
      if (error.kind === "CONFLICT") {
        try {
          const existing = await searchClients(newClient.email.trim());
          const match = existing.find(
            (c) => c.email.toLowerCase() === newClient.email.trim().toLowerCase(),
          );
          setDuplicate(match ?? null);
        } catch {
          setDuplicate(null);
        }
        setFieldErrors({ email: "Ese email ya está registrado" });
      } else {
        setFieldErrors({
          email: "No pudimos crear el cliente. Intenta de nuevo.",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedTier = useMemo(
    () => (selectedClient ? tierFor(selectedClient.purchases) : 0),
    [selectedClient],
  );

  // ── Selected state ─────────────────────────────────────────────────────────
  if (selectedClient) {
    return (
      <div className="client-picker">
        <div className="client-picker-selected">
          <div>
            <strong>{selectedClient.display_name}</strong>
            <div className="muted">{selectedClient.email}</div>
            <div className="client-tier">
              {selectedClient.purchases}{" "}
              {selectedClient.purchases === 1 ? "compra" : "compras"}
              {selectedTier > 0
                ? ` → ${formatPercent(selectedTier)} de descuento`
                : " → sin descuento todavía"}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onSelect(null)}>
            Cambiar
          </Button>
        </div>
      </div>
    );
  }

  // ── Inline creation ────────────────────────────────────────────────────────
  if (creating) {
    return (
      <div className="client-picker">
        <form className="client-create-form" onSubmit={handleCreate} noValidate>
          <h4>Registrar cliente nuevo</h4>

          <Input
            id="new-client-name"
            label="Nombre *"
            value={newClient.display_name}
            onChange={(e) =>
              setNewClient((prev) => ({ ...prev, display_name: e.target.value }))
            }
            placeholder="Nombre del cliente"
          />
          {fieldErrors.display_name && (
            <span className="field-error">{fieldErrors.display_name}</span>
          )}

          <Input
            id="new-client-email"
            label="Email *"
            type="email"
            value={newClient.email}
            onChange={(e) =>
              setNewClient((prev) => ({ ...prev, email: e.target.value }))
            }
            placeholder="cliente@email.com"
          />
          {fieldErrors.email && (
            <span className="field-error">{fieldErrors.email}</span>
          )}

          {duplicate && (
            <div className="client-duplicate">
              <p>
                Ya existe un cliente con ese email:{" "}
                <strong>{duplicate.display_name}</strong>
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onSelect(duplicate);
                  setCreating(false);
                  setQuery("");
                }}
              >
                Usar este cliente
              </Button>
            </div>
          )}

          <div className="client-create-actions">
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Guardando…" : "Crear y seleccionar"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCreating(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // ── Search state ───────────────────────────────────────────────────────────
  return (
    <div className="client-picker">
      <Input
        id="client-search"
        label="Buscar cliente"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Nombre o email…"
        autoComplete="off"
      />

      {searchError && (
        <ErrorMessage>No pudimos buscar clientes. Intenta de nuevo.</ErrorMessage>
      )}

      {searching && <p className="muted">Buscando…</p>}

      {shouldSearch && !searching && results.length === 0 && (
        <p className="muted">Sin resultados para “{debouncedQuery.trim()}”.</p>
      )}

      {results.length > 0 && (
        <ul className="client-results">
          {results.map((client) => {
            const tier = tierFor(client.purchases);
            return (
              <li key={client._id}>
                <button
                  type="button"
                  className="client-result"
                  onClick={() => onSelect(client)}
                >
                  <span className="client-result-name">{client.display_name}</span>
                  <span className="client-result-email">{client.email}</span>
                  <span className="client-result-tier">
                    {client.purchases}{" "}
                    {client.purchases === 1 ? "compra" : "compras"}
                    {tier > 0 ? ` → ${formatPercent(tier)}` : ""}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="client-picker-actions">
        {/* Anonymous must be a deliberate one-click choice, not an escape by
            clearing the search box — otherwise cashiers attach the wrong client
            under time pressure. */}
        <Button variant="secondary" size="sm" onClick={() => onSelect(null)}>
          <Icon name="user" size={16} />
          <span>Venta sin cliente</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={openCreateForm}>
          <Icon name="userPlus" size={16} />
          <span>Crear cliente</span>
        </Button>
      </div>
    </div>
  );
}
