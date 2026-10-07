import { useId } from "react";

import "./Input.css";

export default function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  disabled = false,
  className = "",
  id,
  ...rest
}) {
  // useId is stable across renders. The previous Math.random() generated a fresh
  // id every render, so the label's htmlFor stopped matching the input's id and
  // clicking the label no longer focused the field.
  const generatedId = useId();
  const inputId = id || generatedId;

  return (
    <div className={`input-group ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="input-field"
        {...rest}
      />
    </div>
  );
}
