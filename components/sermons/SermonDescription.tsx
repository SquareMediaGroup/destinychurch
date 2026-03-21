"use client";

import { useState } from "react";

interface SermonDescriptionProps {
  text: string;
}

export default function SermonDescription({ text }: SermonDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  const PREVIEW_LENGTH = 250;
  const isLong = text.length > PREVIEW_LENGTH;
  const displayed = expanded || !isLong ? text : text.slice(0, PREVIEW_LENGTH) + "…";

  return (
    <div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-white/70">
        {displayed}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-sm font-bold text-white/50 transition hover:text-white"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
