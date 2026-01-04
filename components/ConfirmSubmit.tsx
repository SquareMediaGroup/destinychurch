"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ReactNode } from "react";
import { useToast } from "./ToastProvider";

type ConfirmSubmitProps = {
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  pendingLabel?: string;
  form?: string;
  disabled?: boolean;
};

export default function ConfirmSubmit({
  children,
  className,
  confirmMessage,
  pendingLabel,
  form,
  disabled = false,
}: ConfirmSubmitProps) {
  const { pending } = useFormStatus();
  const toast = useToast();
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <button
      form={form}
      type="submit"
      className={className}
      disabled={pending || disabled}
      onClick={(e) => {
        if (pending || disabled) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        if (confirmMessage && !armed) {
          e.preventDefault();
          e.stopPropagation();
          toast.info(confirmMessage, "Confirm action");
          setArmed(true);
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => setArmed(false), 4000);
          return;
        }
        setArmed(false);
      }}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
