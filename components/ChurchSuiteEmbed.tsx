"use client";

import { useState } from "react";

interface Props {
  src: string;
  title: string;
  height?: number;
  minHeight?: number;
  /**
   * Fill the parent's height instead of taking a fixed one, so the embedded
   * page scrolls inside itself. Used by the event modal, where the content is
   * arbitrarily long (description + ticket picker + a multi-step form) and a
   * fixed height would mean either dead space or two nested scrollbars.
   */
  fill?: boolean;
  className?: string;
}

export default function ChurchSuiteEmbed({
  src,
  title,
  height,
  minHeight,
  fill,
  className,
}: Props) {
  const [loaded, setLoaded] = useState(false);

  const sizeStyle = fill
    ? { height: "100%" }
    : height
      ? { height }
      : { minHeight: minHeight ?? 500 };

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={sizeStyle}>
      <div
        aria-hidden="true"
        className={`churchsuite-loading-overlay${loaded ? " is-loaded" : ""}`}
      >
        <div className="churchsuite-spinner" />
        <p
          style={{
            marginTop: 14,
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            color: "rgba(54, 63, 72, 0.35)",
          }}
        >
          Loading
        </p>
      </div>
      <iframe
        src={src}
        className="w-full"
        style={{ ...sizeStyle, border: "none", display: "block" }}
        title={title}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
