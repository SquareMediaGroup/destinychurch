// Real Motion: device frames drawn in code, so there are no bezel images to license or download.
// Put a real screenshot of the product inside (staticFile path), scroll it, or draw over it.
import React from "react";
import { Img, staticFile } from "remotion";
import { C, F } from "./theme";

/**
 * A browser window: title bar with traffic lights and an address pill, the screenshot below.
 * `width` is the window's width in video pixels; the screenshot keeps its aspect (`aspect` = h / w).
 * `scroll` 0..1 scrolls a tall screenshot.
 */
export const BrowserFrame: React.FC<{
  src: string;
  width: number;
  url?: string;
  aspect?: number;
  viewport?: number; // visible height / width of the page area
  scroll?: number;
  dark?: boolean;
  children?: React.ReactNode; // drawn over the page, in page pixels
  style?: React.CSSProperties;
}> = ({ src, width, url, aspect = 0.625, viewport = 0.625, scroll = 0, dark, children, style }) => {
  const bar = Math.round(width * 0.04);
  const pageH = width * viewport;
  const imgH = width * aspect;
  return (
    <div
      style={{
        width,
        borderRadius: width * 0.012,
        overflow: "hidden",
        background: dark ? "#1C1C1E" : C.white,
        boxShadow: "0 40px 100px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
        ...style,
      }}
    >
      <div style={{ height: bar, display: "flex", alignItems: "center", gap: bar * 0.22, padding: `0 ${bar * 0.45}px`, background: dark ? "#2C2C2E" : "#ECECEE" }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: bar * 0.28, height: bar * 0.28, borderRadius: 999, background: c }} />
        ))}
        {url ? (
          <div
            style={{
              margin: "0 auto",
              height: bar * 0.6,
              minWidth: width * 0.32,
              borderRadius: 999,
              background: dark ? "#3A3A3C" : C.white,
              color: dark ? "#EBEBF5" : C.muted,
              fontFamily: F.body,
              fontSize: bar * 0.32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: `0 ${bar * 0.5}px`,
            }}
          >
            {url}
          </div>
        ) : null}
      </div>
      <div style={{ position: "relative", width, height: pageH, overflow: "hidden" }}>
        <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: -scroll * Math.max(0, imgH - pageH), width, height: imgH }} />
        {children}
      </div>
    </div>
  );
};

/**
 * A modern phone: rounded body, thin bezel, a pill-shaped camera cut-out, the screenshot inside.
 * `height` is the phone's height in video pixels. Screenshots are taken at the phone's viewport
 * (for example 402 x 874 points at 3x) and fill the screen; `sourceRatio` = their height / width
 * when taller than the screen, with `scroll` 0..1.
 */
export const PhoneFrame: React.FC<{
  src: string;
  height: number;
  sourceRatio?: number;
  scroll?: number;
  body?: string;
  dark?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ src, height, sourceRatio = 874 / 402, scroll = 0, body = "#1D1D1F", dark, children, style }) => {
  const width = height / 2.07;
  const bezel = width * 0.035;
  const sw = width - bezel * 2;
  const sh = height - bezel * 2;
  const imgH = sw * sourceRatio;
  return (
    <div style={{ position: "relative", width, height, borderRadius: width * 0.17, background: body, boxShadow: "0 40px 90px rgba(0,0,0,0.25)", ...style }}>
      <div style={{ position: "absolute", left: bezel, top: bezel, width: sw, height: sh, borderRadius: width * 0.14, overflow: "hidden", background: dark ? "#000" : C.white }}>
        <Img src={staticFile(src)} style={{ position: "absolute", left: 0, top: -scroll * Math.max(0, imgH - sh), width: sw, height: imgH }} />
        {children}
        <div style={{ position: "absolute", top: sh * 0.014, left: "50%", translate: "-50% 0", width: sw * 0.3, height: sw * 0.085, borderRadius: 999, background: "#000" }} />
      </div>
    </div>
  );
};
