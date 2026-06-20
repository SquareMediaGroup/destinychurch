"use client";

import { useState } from "react";
import EveryoneHasAPlaceSectionNew from "./EveryoneHasAPlaceSectionNew";
import EveryoneHasAPlaceSectionOld from "./EveryoneHasAPlaceSectionOld";

export default function EveryoneHasAPlaceSection() {
  const [useOld, setUseOld] = useState(false);

  return (
    <div className="relative group/toggle">
      {useOld ? <EveryoneHasAPlaceSectionOld /> : <EveryoneHasAPlaceSectionNew />}
      <button
        onClick={() => setUseOld(!useOld)}
        className="absolute top-4 right-4 z-50 rounded-md bg-black/70 px-3 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity hover:bg-black group-hover/toggle:opacity-100 sm:top-8 sm:right-8"
        aria-label="Toggle Version"
      >
        Toggle Version
      </button>
    </div>
  );
}
