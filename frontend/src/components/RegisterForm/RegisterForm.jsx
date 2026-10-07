import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import Button from "../common/Button";
import Input from "../common/Input";
import RegisterErrorMessage from "../RegisterErrorMessage/RegisterErrorMessage";
import "./RegisterForm.css";

/**
 * Staff sign-up.
 *
 * Every account created here is a salesperson: the server hard-codes the
 * "vendor" role and ignores anything this form might send about roles, so an
 * administrator cannot be created through the app. Admins come from the seed
 * script — see the ReadMe.
 *
 * Fields map to the User model: display_name, email, password. There is no phone
 * field, because the model has nowhere to put one.
 */
export default function RegisterForm() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    display_name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorKind, setErrorKind] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

    // Clear this field's error as soon as the user starts correcting it.
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = (values) => {
    const errors = {};

    if (!values.display_name.trim()) {
      errors.display_name = "El nombre es requerido";
    } else if (values.display_name.trim().length < 2) {
      errors.display_name = "El nombre debe de tener al menos dos caracteres";
    }

    if (!values.email.trim()) {
      errors.email = "El email es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = "El email no tiene un formato válido";
    }

    // Must match the User schema's minlength of 8, or the server rejects it.
    if (!values.password.trim()) {
      errors.password = "La contraseña es requerida";
    } else if (values.password.length < 8) {
      errors.password = "La contraseña debe de tener al menos 8 caracteres";
    }

    if (values.confirmPassword !== values.password) {
      errors.confirmPassword = "Las contraseñas no coinciden";
    }

    return errors;
  };

  const onSubmit = async (event) => {
    event.preventDefault();

    const errors = validate(form);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setErrorKind(null);
    setLoading(true);

    try {
      await register({
        display_name: form.display_name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      // Registration does not sign you in. LoginForm reads this state to prefill
      // the email and show a "cuenta creada" banner.
      navigate("/login", {
        state: { justRegistered: true, email: form.email.trim() },
      });
    } catch (err) {
      handleRegisterError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterError = (err) => {
    const kind = err.kind || "UNKNOWN";

    // The email is already taken.
    if (kind === "CONFLICT") {
      setFieldErrors({ email: "Este email ya está registrado" });
      return;
    }

    if (kind === "CLIENT_ERROR" && err.status === 400) {
      const details = err.original?.response?.data?.details;

      // Mongoose validation errors arrive as [{ path, msg }].
      if (Array.isArray(details) && details.length > 0) {
        const mapped = {};
        details.forEach((d) => {
          if (d.path) mapped[d.path] = d.msg;
        });
        if (Object.keys(mapped).length > 0) {
          setFieldErrors(mapped);
          return;
        }
      }

      setErrorKind("BAD_REQUEST");
      return;
    }

    setErrorKind(kind);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h2>Crear cuenta de personal</h2>
        <p className="register-subtitle">
          Las cuentas nuevas se crean como vendedor.
        </p>

        <form className="register-form" onSubmit={onSubmit} noValidate>
          <div className="form-group">
            <Input
              id="display_name"
              label="Nombre completo *"
              type="text"
              value={form.display_name}
              onChange={handleChange("display_name")}
              placeholder="Tu nombre"
              autoComplete="name"
            />
            {fieldErrors.display_name && (
              <span className="field-error">{fieldErrors.display_name}</span>
            )}
          </div>

          <div className="form-group">
            <Input
              id="email"
              label="Email *"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="tu@email.com"
              autoComplete="email"
            />
            {fieldErrors.email && (
              <span className="field-error">{fieldErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <Input
              id="password"
              label="Contraseña *"
              type="password"
              value={form.password}
              onChange={handleChange("password")}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
            {fieldErrors.password && (
              <span className="field-error">{fieldErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <Input
              id="confirmPassword"
              label="Confirmar contraseña *"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange("confirmPassword")}
              placeholder="Repite la contraseña"
              autoComplete="new-password"
            />
            {fieldErrors.confirmPassword && (
              <span className="field-error">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          {errorKind && <RegisterErrorMessage kind={errorKind} />}

          <Button disabled={loading} type="submit" variant="primary">
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>

        <div className="register-footer">
          <span>¿Ya tienes cuenta?</span>
          <Link to="/login">Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}
