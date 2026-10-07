import "./Button.css";

export default function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
  size = "base",
  className = "",
  // Everything else is forwarded. Without this the prop list acts as a
  // whitelist, so `title`, `aria-*` and `data-*` were silently dropped — several
  // explanatory tooltips in the cart and checkout never actually rendered.
  ...rest
}) {
  const buttonClasses = [
    "btn",
    `btn-${variant}`,
    size !== "base" ? `btn-${size}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
