"use client";

import { useState } from "react";

interface Props {
  src: string;
  title: string;
  height?: number;
  minHeight?: number;
  className?: string;
}

export default function ChurchSuiteEmbed({ src, title, height, minHeight, className }: Props) {
  const [loaded, setLoaded] = useState(false);

  const sizeStyle = height ? { height } : { minHeight: minHeight ?? 500 };

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
