import { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { getAllProducts } from "../../services/productServices";
import List from "../../components/List/List";
import "./Home.css";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getAllProducts();
        if (cancelled) return;
        setProducts(data);
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

  return (
    <div>
      {loading && <CircularProgress aria-label="Loading..." />}
      {!loading && error && error === "NETWORK" && (
        <Alert severity="error">
          No pudimos conectar. Revisa tu conexión a internet
        </Alert>
      )}
      {!loading && error && error === "SERVER_ERROR" && (
        <Alert severity="error">Algo salió mal. Intenta mas tarde.</Alert>
      )}
      {!loading && error && error !== "NETWORK" && error !== "SERVER_ERROR" && (
        <Alert severity="error">Ocurrió un error inesperado. {error}</Alert>
      )}
      {!loading && !error && products.length === 0 && (
        <Alert severity="warning">No hay productos en el catálogo.</Alert>
      )}
      {!loading && !error && products.length > 0 && (
        <List
          title="Productos recomendados"
          products={products}
          layout="grid"
        />
      )}
    </div>
  );
}
