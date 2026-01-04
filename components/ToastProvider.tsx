"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastTone = "info" | "success" | "error";

type ToastAction = {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost";
};

type Toast = {
  id: string;
  message: string;
  title?: string;
  tone: ToastTone;
  actions?: ToastAction[];
  durationMs?: number;
};

type ToastContextValue = {
  push: (toast: Omit<Toast, "id"> & { id?: string }) => string;
  remove: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (timeouts.current[id]) {
      clearTimeout(timeouts.current[id]);
      delete timeouts.current[id];
    }
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id"> & { id?: string }) => {
      const id =
        toast.id || crypto.randomUUID?.() || Math.random().toString(36).slice(2);
      const next: Toast = {
        id,
        tone: toast.tone ?? "info",
        message: toast.message,
        title: toast.title,
        actions: toast.actions,
        durationMs: toast.durationMs,
      };
      setToasts((prev) => [...prev, next]);
      const durationMs = toast.durationMs ?? 4200;
      if (durationMs > 0) {
        const timeoutId = window.setTimeout(() => remove(id), durationMs);
        timeouts.current[id] = timeoutId;
      }
      return id;
    },
    [remove],
  );

  const value = useMemo(() => ({ push, remove }), [push, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="assertive" role="status">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            <div className="toast-body">
              {toast.title && <p className="toast-title">{toast.title}</p>}
              <p className="toast-message">{toast.message}</p>
            </div>
            <div className="toast-controls">
              {toast.actions?.length ? (
                <div className="toast-actions">
                  {toast.actions.map((action, index) => (
                    <button
                      key={`${toast.id}-action-${index}`}
                      type="button"
                      className={`toast-action${action.variant === "primary" ? " toast-action-primary" : ""}`}
                      onClick={() => {
                        action.onClick();
                        remove(toast.id);
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <button
                type="button"
                className="toast-close"
                aria-label="Dismiss notification"
                onClick={() => remove(toast.id)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return useMemo(
    () => ({
      push: ctx.push,
      success: (message: string, title = "Success") =>
        ctx.push({ message, title, tone: "success" }),
      error: (message: string, title = "Something went wrong") =>
        ctx.push({ message, title, tone: "error" }),
      info: (message: string, title = "Notice") =>
        ctx.push({ message, title, tone: "info" }),
      dismiss: ctx.remove,
    }),
    [ctx],
  );
}
