import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import Icon from "../../components/common/Icon/Icon";
import "./Header.css";

/**
 * Header for a staff-facing POS.
 *
 * The cart is only shown to signed-in staff: the product list is public so anyone
 * can read the menu, but ringing up a sale is not a thing a member of the public
 * does, and offering a cart that dead-ends at a login screen would be worse than
 * not offering one.
 */
export default function Header() {
  const { user, status, isAuthenticated, isAdmin, logout } = useAuth();
  const { getTotalItems, clearCart } = useCart();
  const navigate = useNavigate();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);

  const count = getTotalItems();

  // Close menus on Escape or an outside click.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Prevent the page behind the mobile menu from scrolling.
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  /**
   * Sign out, then empty the cart.
   *
   * This is where the cart reset lives because the header sits inside both
   * providers; AuthContext is mounted outside CartProvider and cannot reach it.
   * Clearing matters for a shared till: the next person to sign in must not
   * inherit a half-built sale, which would otherwise survive in localStorage.
   */
  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
    await logout();
    clearCart();
    navigate("/");
  };

  const closeMenus = () => {
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  };

  const initials = (() => {
    const name = user?.display_name || user?.email || "Usuario";
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  })();

  const displayName = user?.display_name || user?.email || "Usuario";

  const roleLabel = user?.role === "admin" ? "Administrador" : "Vendedor";

  return (
    <header className="header">
      <div className="header-main">
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo" onClick={closeMenus}>
              Cafecito Feliz
            </Link>

            {/* Admin navigation */}
            {isAdmin && (
              <nav className="header-nav desktop-only">
                <Link to="/admin/products" className="header-nav-link">
                  <Icon name="package" size={18} />
                  <span>Productos</span>
                </Link>
                <Link to="/admin/sales" className="header-nav-link">
                  <Icon name="fileText" size={18} />
                  <span>Ventas</span>
                </Link>
              </nav>
            )}

            <div className="header-actions">
              {/* The cart is a staff tool, so it only appears once signed in. */}
              {isAuthenticated && (
                <Link to="/cart" className="cart-btn" aria-label="Ver carrito">
                  <Icon name="shoppingCart" size={24} />
                  {count > 0 && <span className="cart-badge">{count}</span>}
                </Link>
              )}

              <div className="user-menu-container" ref={userMenuRef}>
                {status === "loading" ? (
                  <span className="muted">…</span>
                ) : isAuthenticated ? (
                  <>
                    <button
                      className={`user-info ${isUserMenuOpen ? "active" : ""}`}
                      onClick={() => setIsUserMenuOpen((open) => !open)}
                      aria-label="Menú de usuario"
                      aria-expanded={isUserMenuOpen}
                    >
                      <div className="user-avatar">
                        <span className="user-initials">{initials}</span>
                      </div>
                      <div className="user-text desktop-only">
                        <span className="greeting">{displayName}</span>
                        <span className="account-text">{roleLabel}</span>
                      </div>
                      <Icon
                        name="chevronDown"
                        size={14}
                        className={`dropdown-arrow ${isUserMenuOpen ? "rotated" : ""}`}
                      />
                    </button>

                    {isUserMenuOpen && (
                      <div className="user-dropdown">
                        <div className="user-profile">
                          <span className="user-name">{displayName}</span>
                          <span className="user-email">{user?.email}</span>
                          <span className="user-role">{roleLabel}</span>
                        </div>

                        {isAdmin && (
                          <div className="user-links">
                            <Link
                              to="/admin/products"
                              className="user-link"
                              onClick={closeMenus}
                            >
                              <Icon name="package" size={16} />
                              Gestionar productos
                            </Link>
                            <Link
                              to="/admin/sales"
                              className="user-link"
                              onClick={closeMenus}
                            >
                              <Icon name="fileText" size={16} />
                              Historial de ventas
                            </Link>
                          </div>
                        )}

                        <div className="logout-section">
                          <button className="logout-btn" onClick={handleLogout}>
                            <Icon name="logOut" size={16} />
                            Cerrar sesión
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Link to="/login" className="auth-btn primary">
                    <Icon name="logIn" size={16} />
                    <span>Iniciar sesión</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
