"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { inputClass, ghostBtn, primaryBtn, dangerBtn } from "@/components/admin/AdminUI";
import { useAdminTheme } from "@/lib/adminTheme";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

type PromptOptions = {
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmRequest = ConfirmOptions & {
  kind: "confirm";
  resolve: (value: boolean) => void;
};

type PromptRequest = PromptOptions & {
  kind: "prompt";
  resolve: (value: string | null) => void;
};

type DialogRequest = ConfirmRequest | PromptRequest;

type DialogContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

// These used to be private copies of the same four AdminUI.tsx tokens — which
// meant this file's dangerBtn had drifted to a raw `bg-red-600` while
// AdminUI.tsx's uses the brand `bg-destiny-red`. Importing them fixes that
// drift and means this dialog gets dark-mode styling for free the moment
// AdminUI.tsx's tokens gain it, rather than needing a second, parallel edit.

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({ kind: "confirm", ...opts, resolve });
      }),
    [],
  );

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setRequest({ kind: "prompt", ...opts, resolve });
      }),
    [],
  );

  const value = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {/*
        This is the one place in the codebase that can safely animate a
        modal's exit: DialogProvider owns its single conditional render site
        (unlike AdminUI.tsx's Modal, mounted behind 15+ different pages' own
        conditionals), so wrapping it in AnimatePresence here doesn't require
        touching any of useDialog()'s callers. Safe with respect to the
        promise this guards, too — cancel()/accept() below call
        request.resolve() and onClose() synchronously, before this animation
        ever starts; only the visual removal is deferred, never the outcome.
      */}
      <AnimatePresence>
        {request && (
          <DialogModal key="dialog" request={request} onClose={() => setRequest(null)} />
        )}
      </AnimatePresence>
    </DialogContext.Provider>
  );
}

function DialogModal({
  request,
  onClose,
}: {
  request: DialogRequest;
  onClose: () => void;
}) {
  const isPrompt = request.kind === "prompt";
  const [value, setValue] = useState(
    isPrompt ? (request as PromptRequest).defaultValue ?? "" : "",
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // DialogProvider is mounted once, site-wide (components/Providers.tsx), so
  // this modal renders as a sibling of the whole app tree rather than a
  // descendant of /admin/layout.tsx's own `.dark`-carrying wrapper div — the
  // ancestor selector every other dark: class in the admin relies on
  // (@custom-variant dark in app/globals.css) would never match here. It
  // carries its own `.dark` instead, and only ever on /admin: /portal also
  // calls useDialog() and is a separate surface with no theme toggle of its
  // own, so it stays light regardless of the stored admin preference.
  const pathname = usePathname();
  const { themeClass } = useAdminTheme();
  const dark = pathname.startsWith("/admin") ? themeClass : "";
  const reduceMotion = useReducedMotion();

  // Cancel resolves the promise with the "declined" value for the dialog kind.
  const cancel = useCallback(() => {
    if (request.kind === "confirm") request.resolve(false);
    else request.resolve(null);
    onClose();
  }, [request, onClose]);

  const accept = useCallback(() => {
    if (request.kind === "confirm") request.resolve(true);
    else request.resolve(value);
    onClose();
  }, [request, value, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [cancel]);

  useEffect(() => {
    // Autofocus the input (prompt) or the confirm button.
    if (isPrompt) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      confirmRef.current?.focus();
    }
  }, [isPrompt]);

  const confirmLabel =
    request.confirmLabel ?? (isPrompt ? "OK" : "Confirm");
  const cancelLabel = request.cancelLabel ?? "Cancel";
  const acceptBtnClass =
    request.kind === "confirm" && request.tone === "danger"
      ? dangerBtn
      : primaryBtn;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.15 }}
      className={`fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60 ${dark}`}
      onClick={cancel}
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
        transition={{ duration: reduceMotion ? 0 : 0.18, ease: "easeOut" }}
        className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-6 shadow-2xl dark:border-white/8 dark:bg-destiny-grey-800"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {request.title && (
          <h2 className="mb-2 text-lg font-black text-destiny-grey dark:text-white">
            {request.title}
          </h2>
        )}
        {request.message && (
          <p className="text-sm leading-relaxed text-destiny-grey/70 dark:text-white/70">
            {request.message}
          </p>
        )}
        {isPrompt && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              accept();
            }}
            className="mt-4"
          >
            <input
              ref={inputRef}
              className={inputClass}
              value={value}
              placeholder={(request as PromptRequest).placeholder}
              onChange={(e) => setValue(e.target.value)}
            />
          </form>
        )}
        <div className="mt-6 flex justify-end gap-2.5">
          <button type="button" className={ghostBtn} onClick={cancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={acceptBtnClass}
            onClick={accept}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return ctx;
}
