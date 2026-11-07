"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import type { DialogRequest } from "./DialogLayer";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
};

export type PromptOptions = {
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

const loadDialogLayer = () => import("./DialogLayer");
const DialogLayer = dynamic(loadDialogLayer, { ssr: false });

type DialogContextValue = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  // Becomes true with the first dialog and stays true (see the render below).
  const [opened, setOpened] = useState(false);
  const close = useCallback(() => setRequest(null), []);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setOpened(true);
        setRequest({ kind: "confirm", ...opts, resolve });
      }),
    [],
  );

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setOpened(true);
        setRequest({ kind: "prompt", ...opts, resolve });
      }),
    [],
  );

  const value = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  return (
    <DialogContext.Provider value={value}>
      {children}
      {/*
        The modal, and the motion library it animates with, load on first use
        rather than with every page: DialogProvider is mounted site-wide but
        only the admin and the staff portal ever open a dialog. Once loaded
        it stays mounted, so AnimatePresence inside it can still play the
        exit animation after `request` goes back to null.
      */}
      {opened && <DialogLayer request={request} onClose={close} />}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  // Anything that can open a dialog warms the modal's chunk, so the first
  // confirm() doesn't wait on a download.
  useEffect(() => {
    void loadDialogLayer();
  }, []);
  if (!ctx) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return ctx;
}
