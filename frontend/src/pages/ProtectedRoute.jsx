import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import Loading from "../components/common/Loading/Loading";

/**
 * Gates a route behind a signed-in staff member, and optionally behind a role.
 *
 *   <ProtectedRoute><Cart /></ProtectedRoute>
 *   <ProtectedRoute allowedRoles={["admin"]}><AdminSales /></ProtectedRoute>
 */
export default function ProtectedRoute({
  children,
  redirectTo = "/login",
  allowedRoles,
}) {
  const { status, user } = useAuth();
  const location = useLocation();

  /**
   * Wait for the session probe before deciding.
   *
   * Treating "loading" as "not signed in" would bounce a signed-in cashier to
   * /login on every hard refresh of a protected page, because the probe has not
   * answered yet. This branch is the whole reason AuthContext tracks three states
   * rather than a boolean.
   */
  if (status === "loading") {
    return (
      <Loading>
        <p>Verificando sesión…</p>
      </Loading>
    );
  }

  if (status !== "authenticated") {
    // `from` is a plain string because LoginForm reads it as one
    // (`location.state?.from || "/"`, then `navigate(from)`), which makes
    // redirect-back-after-login work with no extra wiring.
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // Signed in, but not with sufficient privileges. Render an explanation rather
  // than redirecting: bouncing an authenticated user to /login implies their
  // session is the problem, when the real answer is "not with this account".
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div style={{ textAlign: "center", padding: "48px" }}>
        <h2>Acceso negado</h2>
        <p>No tienes permiso para ver esta página.</p>
        <p className="muted">
          Esta sección es solo para administradores.
        </p>
      </div>
    );
  }

  return children;
}
