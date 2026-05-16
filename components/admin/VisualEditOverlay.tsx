"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface EditableText {
  id: string;
  label: string;
  value: string;
  section: string;
  kind: "heading" | "body" | "cta" | "alt" | "href";
}

export type EditChangeMessage = {
  type: "dc-edit-change";
  id: string;
  value: string;
};

export default function VisualEditOverlay() {
  const params = useSearchParams();
  const isEdit = params.get("__edit") === "1";
  const editId = params.get("__editId");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  // Hide header and footer in edit mode
  useEffect(() => {
    if (!isEdit) return;
    const style = document.createElement("style");
    style.id = "dc-edit-chrome-hide";
    style.textContent = `header, footer { display: none !important; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !editId) return;

    let cancelled = false;

    fetch(`/api/admin/builder/code/${editId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (cancelled) return;
        const texts: EditableText[] = data?.page?.editable_texts ?? [];
        if (texts.length === 0) { setStatus("error"); return; }
        setTimeout(() => {
          if (!cancelled) { activateEditMode(texts); setStatus("ready"); }
        }, 300);
      })
      .catch(() => { if (!cancelled) setStatus("error"); });

    return () => { cancelled = true; };
  }, [isEdit, editId]);

  if (!isEdit || status === "error") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        background: "rgba(255,255,255,0.96)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: "10px 16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        pointerEvents: "none",
        whiteSpace: "nowrap",
        minWidth: 200,
      }}
    >
      {status === "loading" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af" }}>Loading editor…</div>
          <div style={{ height: 3, borderRadius: 99, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: "40%", borderRadius: 99, background: "#f97316", animation: "dc-bar-slide 1.2s ease-in-out infinite" }} />
          </div>
          <style>{`@keyframes dc-bar-slide { 0% { transform: translateX(-100%) } 100% { transform: translateX(350%) } }`}</style>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            Click any highlighted text to edit inline
          </span>
        </div>
      )}
    </div>
  );
}

function activateEditMode(catalog: EditableText[]) {
  // Styles for editable elements
  if (!document.getElementById("dc-visual-edit-styles")) {
    const style = document.createElement("style");
    style.id = "dc-visual-edit-styles";
    style.textContent = `
      [data-edit-id] {
        outline: 2px dashed rgba(249,115,22,0.45) !important;
        outline-offset: 3px !important;
        cursor: text !important;
        border-radius: 3px !important;
        transition: outline-color 0.12s, background-color 0.12s !important;
      }
      [data-edit-id]:hover {
        outline: 2px solid rgba(249,115,22,0.9) !important;
        background-color: rgba(249,115,22,0.05) !important;
      }
      [data-edit-id][data-edit-active] {
        outline: 2px solid rgba(249,115,22,1) !important;
        background-color: rgba(255,255,255,0.95) !important;
        border-radius: 3px !important;
        min-width: 4px !important;
      }
      [data-edit-id][data-edit-dirty]:not([data-edit-active]) {
        outline: 2px solid rgba(34,197,94,0.9) !important;
        background-color: rgba(34,197,94,0.06) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Build excluded regions: header, footer, and "Worship With Us" section
  const excludedRoots = new Set<Element>();
  document.querySelectorAll("header, footer").forEach((el) => excludedRoots.add(el));

  // Find "Worship With Us" heading and exclude its nearest section-level ancestor.
  // Walk up at most 6 levels and stop before MAIN/BODY so we never exclude the whole page.
  document.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
    if (!/worship with us/i.test(heading.textContent?.trim() ?? "")) return;
    let container: Element = heading;
    for (let depth = 0; depth < 6; depth++) {
      const parent = container.parentElement;
      if (!parent) break;
      const tag = parent.tagName;
      if (tag === "MAIN" || tag === "BODY" || tag === "HTML") break;
      container = parent;
      if (tag === "SECTION" || tag === "ARTICLE") break;
    }
    excludedRoots.add(container);
  });

  function isExcluded(el: Element): boolean {
    let node: Element | null = el;
    while (node && node !== document.body) {
      if (excludedRoots.has(node)) return true;
      node = node.parentElement;
    }
    return false;
  }

  // Normalise: collapse whitespace including non-breaking spaces ( )
  const norm = (s: string) => s.replace(/[\s ]+/g, " ").trim();

  // Build text → catalog map (skip hrefs)
  const byValue = new Map<string, EditableText>();
  for (const t of catalog) {
    if (t.kind !== "href") byValue.set(norm(t.value), t);
  }

  // Include div so text inside plain wrapper divs is also found
  const TAGS = "h1, h2, h3, h4, h5, h6, p, div, span, a, button, li, figcaption, blockquote, dt, dd, label, strong, em, small";
  const elements = document.querySelectorAll<HTMLElement>(TAGS);

  for (const el of elements) {
    if (el.hasAttribute("data-edit-id")) continue;
    if (isExcluded(el)) continue;
    const text = norm(el.textContent ?? "");
    if (!text || text.length < 2) continue;
    const match = byValue.get(text);
    if (!match) continue;

    const matchId = match.id;
    const matchValue = match.value;
    const matchKind = match.kind;

    el.setAttribute("data-edit-id", matchId);

    const isLink = el.tagName === "A";
    const isBodyText = matchKind === "body";

    function startEditing() {
      el.setAttribute("data-edit-active", "1");
      (el as HTMLElement).contentEditable = "plaintext-only";
      el.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }

    function finishEditing() {
      const newValue = el.textContent?.trim() ?? "";
      (el as HTMLElement).contentEditable = "false";
      el.removeAttribute("data-edit-active");
      if (newValue !== matchValue) el.setAttribute("data-edit-dirty", "1");
      window.parent.postMessage({ type: "dc-edit-change", id: matchId, value: newValue } as EditChangeMessage, "*");
    }

    el.addEventListener("click", (e) => {
      // Always prevent link navigation
      if (isLink) e.preventDefault();
      // Only intercept first click to start editing
      if (!el.hasAttribute("data-edit-active")) {
        e.stopPropagation();
        startEditing();
      }
    }, true);

    el.addEventListener("blur", finishEditing);

    el.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // Restore original text and cancel
        el.textContent = matchValue;
        el.removeAttribute("data-edit-dirty");
        (el as HTMLElement).contentEditable = "false";
        el.removeAttribute("data-edit-active");
        window.parent.postMessage({ type: "dc-edit-change", id: matchId, value: matchValue } as EditChangeMessage, "*");
        e.preventDefault();
      }
      // Enter confirms edit for non-body text
      if (e.key === "Enter" && !isBodyText) {
        e.preventDefault();
        el.blur();
      }
    });
  }
}
