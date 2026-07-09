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

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-destiny-grey outline-none transition placeholder:text-destiny-grey/30 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15";
const ghostBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-destiny-grey/70 transition hover:bg-[#f5f7fa]";
const primaryBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60";
const dangerBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60";

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
      {request && (
        <DialogModal request={request} onClose={() => setRequest(null)} />
      )}
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
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={cancel}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-black/5 bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {request.title && (
          <h2 className="mb-2 text-lg font-black text-destiny-grey">
            {request.title}
          </h2>
        )}
        {request.message && (
          <p className="text-sm leading-relaxed text-destiny-grey/70">
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
      </div>
    </div>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog must be used within a DialogProvider");
  }
  return ctx;
}
