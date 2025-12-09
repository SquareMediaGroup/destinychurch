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

type Toast = {
  id: string;
  message: string;
  title?: string;
  tone: ToastTone;
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
      };
      setToasts((prev) => [...prev, next]);
      const timeoutId = window.setTimeout(() => remove(id), 4200);
      timeouts.current[id] = timeoutId;
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
            <button
              type="button"
              className="toast-close"
              aria-label="Dismiss notification"
              onClick={() => remove(toast.id)}
            >
              ×
            </button>
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
