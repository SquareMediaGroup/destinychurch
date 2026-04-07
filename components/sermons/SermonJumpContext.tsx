"use client";

import { createContext, useContext, useRef, useState } from "react";

interface SermonJumpContextValue {
  jumpFnRef: React.MutableRefObject<(() => void) | null>;
  showJump: boolean;
  hideJump: () => void;
  sermonStart: number | null;
}

const SermonJumpContext = createContext<SermonJumpContextValue | null>(null);

export function SermonJumpProvider({
  children,
  sermonStart,
}: {
  children: React.ReactNode;
  sermonStart: number | null | undefined;
}) {
  const jumpFnRef = useRef<(() => void) | null>(null);
  const [showJump, setShowJump] = useState(!!sermonStart);

  return (
    <SermonJumpContext.Provider
      value={{
        jumpFnRef,
        showJump,
        hideJump: () => setShowJump(false),
        sermonStart: sermonStart ?? null,
      }}
    >
      {children}
    </SermonJumpContext.Provider>
  );
}

export function useSermonJump() {
  const ctx = useContext(SermonJumpContext);
  if (!ctx) throw new Error("useSermonJump must be used within SermonJumpProvider");
  return ctx;
}
