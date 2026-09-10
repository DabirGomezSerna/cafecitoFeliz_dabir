import apiClient from "./apiClient";

export async function getAllProducts() {
  const response = await apiClient.get("/products");
  return response.data;
}

