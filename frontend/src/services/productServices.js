import apiClient from "./apiClient";

/**
 * Products.
 *
 * Reading the menu is public. Creating, updating and deleting require an admin
 * session — the server enforces that, so a vendor calling these receives 403.
 */

export async function getAllProducts() {
  const response = await apiClient.get("/products");
  return response.data;
}

export async function createProduct({ name, description, price, stock }) {
  const response = await apiClient.post("/products", {
    name,
    description,
    price,
    stock,
  });
  return response.data;
}

/**
 * Update a product. Only the fields passed here are changed — the server leaves
 * anything omitted alone, so a price-only edit will not blank the description.
 */
export async function updateProduct(id, changes) {
  const response = await apiClient.put(`/products/${id}`, changes);
  return response.data;
}

export async function deleteProduct(id) {
  const response = await apiClient.delete(`/products/${id}`);
  return response.data;
}
