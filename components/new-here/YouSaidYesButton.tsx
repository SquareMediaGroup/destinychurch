"use client";

import { useState } from "react";
import ChurchSuiteModal from "@/components/ui/ChurchSuiteModal";

export default function YouSaidYesButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex w-fit items-center rounded-full border border-destiny-grey/30 px-5 py-2 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
      >
        Register your interest
      </button>

      <ChurchSuiteModal
        open={open}
        onClose={() => setOpen(false)}
        src="https://destinytees.churchsuite.com/-/forms/uwqnm8of"
        title="You Said Yes!"
        embedTitle="You Said Yes registration form"
      />
    </>
  );
}
