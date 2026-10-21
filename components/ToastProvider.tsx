"use client";

import { useMemo } from "react";
import { Toaster, toast as sonner } from "sonner";

// Toasts are rendered by sonner (https://github.com/emilkowalski/sonner) for
// stacking, swipe-to-dismiss, hover-to-expand and enter/exit animation. The
// look is ours: sonner runs `unstyled` and the `.dc-toast*` classes in
// globals.css apply the glass recipe. `useToast()` keeps its original API so
// call sites don't need to know which library sits underneath.

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
  /** 0 keeps the toast up until the user acts or dismisses it. */
  durationMs?: number;
};

type PushInput = Omit<Toast, "id" | "tone"> & { id?: string; tone?: ToastTone };

const DEFAULT_DURATION_MS = 4200;

function push(input: PushInput): string {
  const id =
    input.id || crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  const tone = input.tone ?? "info";

  // sonner has one primary slot (`action`) and one secondary slot (`cancel`).
  // Both dismiss the toast after running, matching the old behaviour.
  const primary = input.actions?.find((a) => a.variant === "primary");
  const secondary = input.actions?.find((a) => a !== primary);

  const show = tone === "success" ? sonner.success : tone === "error" ? sonner.error : sonner.info;
  show(input.title ?? input.message, {
    id,
    description: input.title ? input.message : undefined,
    duration:
      input.durationMs === 0 ? Infinity : (input.durationMs ?? DEFAULT_DURATION_MS),
    action: primary ? { label: primary.label, onClick: primary.onClick } : undefined,
    cancel: secondary ? { label: secondary.label, onClick: secondary.onClick } : undefined,
  });
  return id;
}

function remove(id: string) {
  sonner.dismiss(id);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        theme="dark"
        gap={10}
        // Lift the stack above the cookie banner while it is showing
        // (CookieBanner publishes --cookie-banner-clearance).
        offset={{ bottom: "var(--cookie-banner-clearance, 1.5rem)", right: "1.5rem" }}
        mobileOffset={{ bottom: "var(--cookie-banner-clearance, 1rem)", left: "1rem", right: "1rem" }}
        visibleToasts={4}
        closeButton
        containerAriaLabel="Notifications"
        toastOptions={{
          unstyled: true,
          closeButtonAriaLabel: "Dismiss notification",
          classNames: {
            toast: "dc-toast",
            success: "dc-toast-success",
            error: "dc-toast-error",
            info: "dc-toast-info",
            icon: "dc-toast-icon",
            content: "dc-toast-content",
            title: "dc-toast-title",
            description: "dc-toast-message",
            actionButton: "dc-toast-action dc-toast-action-primary",
            cancelButton: "dc-toast-action",
            closeButton: "dc-toast-close",
          },
        }}
      />
    </>
  );
}

export function useToast() {
  return useMemo(
    () => ({
      push,
      success: (message: string, title = "Success") =>
        push({ message, title, tone: "success" }),
      error: (message: string, title = "Something went wrong") =>
        push({ message, title, tone: "error" }),
      info: (message: string, title = "Notice") =>
        push({ message, title, tone: "info" }),
      dismiss: remove,
    }),
    [],
  );
}
