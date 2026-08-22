import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { AlertMessage } from "./Feedback";

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 7h16M4 12h16M4 17h16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

function menuLinkClass({ isActive }: { isActive: boolean }) {
  return `header-menu-link${isActive ? " active" : ""}`;
}

export function Layout({
  children,
  guest = false,
}: {
  children: ReactNode;
  guest?: boolean;
}) {
  const { user, logout, loading } = useAuth();
  const location = useLocation();
  const headerRef = useRef<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 479px)");
    function onViewportChange() {
      if (!media.matches) setMenuOpen(false);
    }
    media.addEventListener("change", onViewportChange);
    return () => media.removeEventListener("change", onViewportChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setMenuOpen(false);
    await logout();
  }

  return (
    <div className="shell">
      <header className="header" ref={headerRef}>
        <Link to={user ? "/dashboard" : "/"} className="brand">
          EzSplitBill
        </Link>
        <div className="header-end">
          {!loading && user ? (
            <span className="user-chip" title={user.username}>
              @{user.username}
            </span>
          ) : null}
          <div className="header-actions">
            {loading ? null : user ? (
              <>
                <NavLink to="/dashboard" className="btn btn-secondary">
                  Bills
                </NavLink>
                <button type="button" className="btn btn-secondary" onClick={() => void logout()}>
                  Logout
                </button>
              </>
            ) : guest ? (
              <>
                <NavLink to="/login" end className="btn btn-secondary">
                  Login
                </NavLink>
                <NavLink to="/register" end className="btn">
                  Register
                </NavLink>
              </>
            ) : null}
          </div>

          {!loading ? (
            <>
              <button
                type="button"
                className="header-menu-toggle"
                aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
              <nav
                id="mobile-navigation"
                className={`header-menu${menuOpen ? " is-open" : ""}`}
                aria-hidden={!menuOpen}
              >
                {user ? (
                  <>
                    <NavLink to="/dashboard" end className={menuLinkClass} onClick={() => setMenuOpen(false)}>
                      Bills
                    </NavLink>
                    <button type="button" className="header-menu-link" onClick={() => void handleLogout()}>
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink to="/login" end className={menuLinkClass} onClick={() => setMenuOpen(false)}>
                      Login
                    </NavLink>
                    <NavLink to="/register" end className={menuLinkClass} onClick={() => setMenuOpen(false)}>
                      Register
                    </NavLink>
                  </>
                )}
              </nav>
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
