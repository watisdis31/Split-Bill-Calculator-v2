import { useState } from "react";
import { FieldError } from "./Feedback";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M3 3l18 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.6 10.6a3 3 0 0 0 4.2 4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9.9 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a13 13 0 0 1-1.7 2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.6 6.6C4.3 8.1 2.8 10.2 2 12c0 0 3.6 7 10 7 1.4 0 2.7-.3 3.9-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PasswordInput({
  id,
  label,
  value,
  onChange,
  error,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input-shell password-field-shell${error ? " input-invalid" : ""}`}>
        <input
          id={id}
          className="input"
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      <FieldError id={errorId} message={error} />
    </div>
  );
}
