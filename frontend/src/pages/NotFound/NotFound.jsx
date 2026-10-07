import { Link } from "react-router-dom";

import Icon from "../../components/common/Icon/Icon";

export default function NotFound() {
  return (
    <div style={{ textAlign: "center", padding: "64px 24px" }}>
      <h2>Página no encontrada</h2>
      <p className="muted">La dirección que buscas no existe.</p>
      <Link to="/" className="button primary">
        <Icon name="home" size={20} />
        <span>Volver al inicio</span>
      </Link>
    </div>
  );
}
