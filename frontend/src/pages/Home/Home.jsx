import { useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { Grid, Card, CardContent } from "@mui/material";
import { getAllProducts } from "../../services/productServices";

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
        console.log(data);
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
        <Grid container spacing={2} columns={12}>
          {products.map((product) => (
            <Grid size={6}>
              <Card
                variant="outlined"
                sx={{ maxWidth: 355 }}
              >
                <CardContent>{product.name}</CardContent>
                <CardContent>{product.description}</CardContent>
                <CardContent>{product.price}</CardContent>
                <CardContent>{product.stock}</CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </div>
  );
}
