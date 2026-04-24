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
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-white transition-opacity duration-500 ${loaded ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <div className="relative flex items-center justify-center">
          <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-destiny-orange/20 border-t-destiny-orange" />
          <div className="absolute h-8 w-8 rounded-full bg-destiny-orange/10" />
        </div>
        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-destiny-grey/30">
          Loading
        </p>
      </div>
      <iframe
        src={src}
        className="w-full"
        style={{ ...sizeStyle, border: "none", display: "block" }}
        title={title}
        loading="lazy"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}
