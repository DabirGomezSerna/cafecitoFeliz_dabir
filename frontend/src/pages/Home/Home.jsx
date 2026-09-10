import { useEffect, useState } from "react";
import { getAllProducts } from "../services/productsService";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllProducts();
        if (cancelled) return;
        setProducts(data.products);
        setPagination(data.pagination);
      } catch (err) {
        if (!cancelled) setError(err.kind || "UNKNOWN");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, []);

  return <div>{products.map((products) => {})}</div>;
}
