"use client";
import { useEffect } from "react";

export default function HomeOverscrollColor() {
  useEffect(() => {
    document.documentElement.style.background = "#F58021";
    return () => { document.documentElement.style.background = ""; };
  }, []);
  return null;
}
