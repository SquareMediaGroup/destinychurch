"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import ChurchSuiteModal from "@/components/ui/ChurchSuiteModal";

interface Props {
  variant?: "dark" | "light";
}

export default function GiveCTA({ variant = "dark" }: Props) {
  const [open, setOpen] = useState(false);

  const subtitleClass = variant === "dark" ? "text-on-dark-muted" : "text-subtle";

  return (
    <>
      <Button
        variant="primary"
        shape="card"
        size="cta"
        onClick={() => setOpen(true)}
        className="group text-left"
      >
        <span className="material-symbols-rounded text-2xl text-white">volunteer_activism</span>
        <span>
          <span className="block text-sm font-black text-white">Give Online</span>
          <span className={`block text-xs ${subtitleClass}`}>Secure giving via ChurchSuite</span>
        </span>
        <span className="material-symbols-rounded ml-4 text-lg text-white/60 transition group-hover:translate-x-1">arrow_forward</span>
      </Button>

      <ChurchSuiteModal
        open={open}
        onClose={() => setOpen(false)}
        src="https://destinytees.churchsuite.com/donate"
        title="Give Online"
        embedTitle="Give Online — Destiny Church"
      />
    </>
  );
}
