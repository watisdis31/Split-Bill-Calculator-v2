import { Link, NavLink } from "react-router-dom";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { AlertMessage } from "./Feedback";

export function Layout({
  children,
  narrow = false,
  guest = false,
}: {
  children: ReactNode;
  narrow?: boolean;
  guest?: boolean;
}) {
  const { user, logout } = useAuth();

  return (
    <div className={`shell ${narrow ? "shell-narrow" : ""}`}>
      <header className="header">
        <Link to={user ? "/dashboard" : "/"} className="brand">
          EasySplitBill
        </Link>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-chip" title={user.username}>
                @{user.username}
              </span>
              <NavLink to="/dashboard" className="btn btn-secondary">
                Bills
              </NavLink>
              <button type="button" className="btn btn-secondary" onClick={() => void logout()}>
                Logout
              </button>
            </>
          ) : guest ? (
            <>
              <NavLink to="/login" className="btn btn-secondary">
                Login
              </NavLink>
              <NavLink to="/register" className="btn">
                Register
              </NavLink>
            </>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}

export function Button({
  children,
  loading = false,
  loadingLabel,
  className = "",
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <button type={type} className={`btn ${className}`} {...props} disabled={disabled || loading}>
      <span className="btn-label">{loading ? loadingLabel || "Please wait..." : children}</span>
    </button>
  );
}

export function ConfirmDialog({
  title,
  message,
  warning,
  confirmLabel = "Delete",
  loading = false,
  loadingLabel = "Please wait...",
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  warning?: string;
  confirmLabel?: string;
  loading?: boolean;
  loadingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="dialog">
        <h3 id="confirm-title">{title}</h3>
        <p className="dialog-copy">{message}</p>
        {warning ? <AlertMessage type="warning" message={warning} /> : null}
        <div className="actions">
          <Button className="btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button className="btn-danger" loading={loading} loadingLabel={loadingLabel} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
