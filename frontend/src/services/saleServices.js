import apiClient from "./apiClient";

export async function createSale() {
  const response = await apiClient.get("/sales");
  return response.data;
}

