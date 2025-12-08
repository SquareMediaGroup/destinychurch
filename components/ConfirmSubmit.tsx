"use client";

import { useFormStatus } from "react-dom";
import { ReactNode } from "react";

type ConfirmSubmitProps = {
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  pendingLabel?: string;
};

export default function ConfirmSubmit({
  children,
  className,
  confirmMessage,
  pendingLabel,
}: ConfirmSubmitProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(e) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
