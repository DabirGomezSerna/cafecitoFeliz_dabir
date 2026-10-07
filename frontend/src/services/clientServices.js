import apiClient from "./apiClient";

/**
 * Clients (the café's customers — not staff accounts).
 *
 * Staff-only: every route here requires a signed-in vendor or admin, because the
 * client list is the project's real store of personal data.
 */

/**
 * Search clients by name or email. Called debounced from the client picker.
 * Omitting `q` returns a capped list rather than the whole table.
 */
export async function searchClients(q) {
  const response = await apiClient.get("/clients", {
    params: q ? { q } : undefined,
  });
  return response.data;
}

export async function getClientById(id) {
  const response = await apiClient.get(`/clients/${id}`);
  return response.data;
}

/**
 * Register a new customer, so they begin accruing loyalty purchases.
 *
 * `purchases` is deliberately not a parameter: it drives the discount and is
 * server-managed, advanced only by a committed sale.
 */
export async function createClient({ display_name, email }) {
  const response = await apiClient.post("/clients", { display_name, email });
  return response.data;
}
