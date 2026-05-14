"use client";

import { useEffect, useRef, useState } from "react";
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
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(true);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hide site chrome immediately
  useEffect(() => {
    if (!isEdit) return;
    const style = document.createElement("style");
    style.id = "dc-edit-chrome-hide";
    style.textContent = `header, footer { display: none !important; }`;
    document.head.appendChild(style);
    return () => style.remove();
  }, [isEdit]);

  // Auto-dismiss tooltip after 6 s once ready
  useEffect(() => {
    if (status !== "ready" || dismissed) return;
    dismissTimer.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setDismissed(true), 300);
    }, 6000);
    return () => {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    };
  }, [status, dismissed]);

  // Dismiss on first edit click (fired from activateEditMode)
  useEffect(() => {
    if (!isEdit) return;
    function onFirstEdit() {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      setVisible(false);
      setTimeout(() => setDismissed(true), 300);
    }
    window.addEventListener("dc-first-edit", onFirstEdit);
    return () => window.removeEventListener("dc-first-edit", onFirstEdit);
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

  if (!isEdit || dismissed) return null;

  function handleDismiss() {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    setVisible(false);
    setTimeout(() => setDismissed(true), 300);
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 12,
        padding: "9px 10px 9px 14px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.06)",
        whiteSpace: "nowrap",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
    >
      {/* Status dot */}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          flexShrink: 0,
          background:
            status === "error"
              ? "#ef4444"
              : status === "ready"
                ? "#f97316"
                : "#d1d5db",
          boxShadow: status === "ready" ? "0 0 0 3px rgba(249,115,22,0.15)" : undefined,
        }}
      />
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: status === "error" ? "#dc2626" : "#374151",
          letterSpacing: "-0.01em",
        }}
      >
        {status === "loading" && "Activating edit mode…"}
        {status === "ready" && "Click any highlighted text to edit"}
        {status === "error" && "Scan for texts first to enable editing"}
      </span>

      {/* Dismiss */}
      {status !== "loading" && (
        <button
          onClick={handleDismiss}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            borderRadius: 6,
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "rgba(0,0,0,0.35)",
            flexShrink: 0,
            fontSize: 14,
            lineHeight: 1,
            transition: "background 0.12s, color 0.12s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,0.06)";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.7)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "none";
            (e.currentTarget as HTMLButtonElement).style.color = "rgba(0,0,0,0.35)";
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function activateEditMode(catalog: EditableText[]) {
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

  const byValue = new Map<string, EditableText>();
  for (const t of catalog) {
    if (t.kind !== "href") {
      byValue.set(t.value.trim(), t);
    }
  }

  let firstClick = true;
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
        if (firstClick) {
          firstClick = false;
          window.dispatchEvent(new CustomEvent("dc-first-edit"));
        }
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
