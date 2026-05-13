"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type StudioPage = {
  id: string;
  title: string;
  slug: string;
  status: string;
  schema_version: number;
  updated_at: string;
};

export default function StudioListPage() {
  const [pages, setPages] = useState<StudioPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    fetchPages();
  }, []);

  async function fetchPages() {
    try {
      const res = await fetch("/api/admin/studio/pages");
      if (res.ok) {
        const data = await res.json();
        setPages(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/studio/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        const page = await res.json();
        window.location.href = `/admin/studio/${page.id}`;
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "#111",
              margin: 0,
            }}
          >
            Studio Pages
          </h1>
          <p style={{ fontSize: 14, color: "#666", marginTop: 4 }}>
            Visual page editor with full design control
          </p>
        </div>
      </div>

      {/* Create new page */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
          padding: 16,
          background: "#fff",
          borderRadius: 12,
          border: "1px solid #e5e7eb",
        }}
      >
        <input
          type="text"
          placeholder="New page title..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          onClick={handleCreate}
          disabled={creating || !newTitle.trim()}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: "none",
            background: creating ? "#94a3b8" : "#2563eb",
            color: "#fff",
            fontSize: 14,
            fontWeight: 500,
            cursor: creating ? "wait" : "pointer",
          }}
        >
          {creating ? "Creating..." : "Create Page"}
        </button>
      </div>

      {/* Pages list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
          Loading...
        </div>
      ) : pages.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            color: "#999",
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
          }}
        >
          <p style={{ fontSize: 16, marginBottom: 4 }}>
            No studio pages yet
          </p>
          <p style={{ fontSize: 13 }}>
            Create your first page above
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {pages.map((page) => (
            <Link
              key={page.id}
              href={`/admin/studio/${page.id}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                textDecoration: "none",
                color: "inherit",
                transition: "border-color 0.15s",
              }}
            >
              <div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "#111" }}
                >
                  {page.title}
                </div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                  /{page.slug}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 500,
                    background:
                      page.status === "published"
                        ? "#dcfce7"
                        : page.status === "draft"
                          ? "#fef3c7"
                          : "#f3f4f6",
                    color:
                      page.status === "published"
                        ? "#166534"
                        : page.status === "draft"
                          ? "#92400e"
                          : "#6b7280",
                  }}
                >
                  {page.status}
                </span>
                <span style={{ fontSize: 11, color: "#aaa" }}>
                  {new Date(page.updated_at).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
