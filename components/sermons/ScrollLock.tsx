"use client";

import { useEffect } from "react";

// Locks page scrolling while mounted, restoring the previous values on unmount
// (e.g. when navigating away). Used by the sermons maintenance page so it stays
// a single, fixed viewport with no scroll.
export default function ScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";

    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  return null;
}
