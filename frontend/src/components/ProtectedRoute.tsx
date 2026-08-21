import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import { safeRedirectPath } from "../utils/redirect";
import { StatusMessage } from "./Feedback";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="shell">
        <StatusMessage>Loading...</StatusMessage>
      </div>
    );
  }

  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="shell">
        <StatusMessage>Loading...</StatusMessage>
      </div>
    );
  }

  if (user) {
    const params = new URLSearchParams(location.search);
    const redirect = safeRedirectPath(params.get("redirect")) || "/dashboard";
    return <Navigate to={redirect} replace />;
  }

  return children;
}
