import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type FeedbackType = "success" | "error" | "warning" | "info";

export function AlertMessage({
  type,
  message,
  onDismiss,
}: {
  type: FeedbackType;
  message: string;
  onDismiss?: () => void;
}) {
  if (!message) return null;

  return (
    <div
      className={`alert alert-${type}`}
      role={type === "error" || type === "warning" ? "alert" : "status"}
    >
      <p>{message}</p>
      {onDismiss ? (
        <button type="button" className="alert-dismiss" aria-label="Dismiss message" onClick={onDismiss}>
          ×
        </button>
      ) : null}
    </div>
  );
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error" role="alert">
      {message}
    </p>
  );
}

interface ToastItem {
  id: number;
  type: FeedbackType;
  message: string;
}

interface ToastContextValue {
  notify: (type: FeedbackType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (type: FeedbackType, message: string) => {
      if (!message) return;
      const id = toastId++;
      setToasts((current) => [...current.slice(-2), { id, type, message }]);
      const ttl = type === "error" ? 6000 : 3000;
      window.setTimeout(() => dismiss(id), ttl);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-host" aria-live="polite" aria-relevant="additions text">
        {toasts.map((toast) => (
          <AlertMessage
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onDismiss={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
