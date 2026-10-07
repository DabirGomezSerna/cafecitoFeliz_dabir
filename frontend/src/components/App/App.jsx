import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "../../context/AuthContext";
import { CartProvider } from "../../context/CartContext";
import Layout from "../../layout/Layout";
import ProtectedRoute from "../../pages/ProtectedRoute";

import Home from "../../pages/Home/Home";
import Login from "../../pages/Login/Login";
import Register from "../../pages/Register/Register";
import Cart from "../../pages/Cart/Cart";
import Checkout from "../../pages/Checkout/Checkout";
import Ticket from "../../pages/Ticket/Ticket";
import NotFound from "../../pages/NotFound/NotFound";

import "./App.css";

function App() {
  return (
    <BrowserRouter>
      {/*
        AuthProvider wraps CartProvider so the Header can read both. It must not
        be nested inside: the Header needs auth, and it lives in Layout.

        The consequence is that AuthContext cannot clear the cart on logout — it
        has no access to it. Header.handleLogout does that instead, since it sits
        inside both providers. The providers stay decoupled and the component that
        knows about both does the coordinating.
      */}
      <AuthProvider>
        <CartProvider>
          <Layout>
            <Routes>
              {/* Public: reading the menu needs no account. */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Staff only. */}
              <Route
                path="/cart"
                element={
                  <ProtectedRoute>
                    <Cart />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute>
                    <Checkout />
                  </ProtectedRoute>
                }
              />

              {/* Keyed by sale id, so a ticket is deep-linkable and reprintable. */}
              <Route
                path="/ticket/:id"
                element={
                  <ProtectedRoute>
                    <Ticket />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
