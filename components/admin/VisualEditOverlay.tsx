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

export type EditClickMessage = {
  type: "dc-edit-click";
  id: string;
  label: string;
  value: string;
  section: string;
  kind: EditableText["kind"];
};

export type EditUpdateMessage = {
  type: "dc-edit-update";
  id: string;
  value: string;
};

// Injected into the public page iframe when ?__edit=1&__editId=UUID is present.
// Scans the DOM for text matching the editable_texts catalog and adds click
// handlers that postMessage back to the admin parent frame.
export default function VisualEditOverlay() {
  const params = useSearchParams();
  const isEdit = params.get("__edit") === "1";
  const editId = params.get("__editId");
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );

  // Hide site chrome (header, footer, banners) immediately in edit mode
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
        if (texts.length === 0) {
          setStatus("error");
          return;
        }
        // Run after hydration settles
        setTimeout(() => {
          if (!cancelled) {
            activateEditMode(texts);
            setStatus("ready");
          }
        }, 300);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    // Listen for messages from parent frame
    function onMessage(e: MessageEvent) {
      if (e.data?.type === "dc-edit-update") {
        const { id, value } = e.data as EditUpdateMessage;
        document
          .querySelectorAll(`[data-edit-id="${CSS.escape(id)}"]`)
          .forEach((el) => {
            el.textContent = value;
            el.setAttribute("data-edit-dirty", "1");
          });
      }
      if (e.data?.type === "dc-edit-highlight") {
        const el = document.querySelector(
          `[data-edit-id="${CSS.escape(e.data.id)}"]`
        );
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    window.addEventListener("message", onMessage);
    return () => {
      cancelled = true;
      window.removeEventListener("message", onMessage);
    };
  }, [isEdit, editId]);

  if (!isEdit) return null;

  const bg =
    status === "error"
      ? "#ef4444"
      : status === "ready"
        ? "rgba(249,115,22,0.95)"
        : "rgba(80,80,80,0.8)";

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        background: bg,
        color: "white",
        fontSize: 11,
        fontWeight: 700,
        padding: "6px 16px",
        borderRadius: 8,
        letterSpacing: "0.1em",
        boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
        pointerEvents: "none",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {status === "loading" && "Activating edit mode…"}
      {status === "ready" && "Click any highlighted text to edit"}
      {status === "error" && "Edit mode unavailable — scan for texts first"}
    </div>
  );
}

function activateEditMode(catalog: EditableText[]) {
  // Inject CSS for editable highlights
  if (!document.getElementById("dc-visual-edit-styles")) {
    const style = document.createElement("style");
    style.id = "dc-visual-edit-styles";
    style.textContent = `
      [data-edit-id] {
        outline: 2px dashed rgba(249,115,22,0.5) !important;
        outline-offset: 3px !important;
        cursor: pointer !important;
        transition: outline-color 0.12s, background-color 0.12s !important;
        border-radius: 3px !important;
      }
      [data-edit-id]:hover {
        outline: 2px solid rgba(249,115,22,1) !important;
        background-color: rgba(249,115,22,0.08) !important;
      }
      [data-edit-id][data-edit-dirty] {
        outline: 2px solid rgba(34,197,94,1) !important;
        background-color: rgba(34,197,94,0.07) !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Build value → catalog item map (skip hrefs)
  const byValue = new Map<string, EditableText>();
  for (const t of catalog) {
    if (t.kind !== "href") {
      byValue.set(t.value.trim(), t);
    }
  }

  // Tag matching elements
  const TAGS =
    "h1, h2, h3, h4, h5, h6, p, span, a, button, li, figcaption, blockquote, dt, dd, label, td, th";
  const elements = document.querySelectorAll<HTMLElement>(TAGS);

  for (const el of elements) {
    if (el.hasAttribute("data-edit-id")) continue;
    const text = el.textContent?.trim();
    if (!text || text.length < 2) continue;
    const match = byValue.get(text);
    if (!match) continue;

    el.setAttribute("data-edit-id", match.id);

    el.addEventListener(
      "click",
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        const msg: EditClickMessage = {
          type: "dc-edit-click",
          id: match.id,
          label: match.label,
          value: el.textContent?.trim() ?? match.value,
          section: match.section,
          kind: match.kind,
        };
        window.parent.postMessage(msg, "*");
      },
      true
    );
  }
}
