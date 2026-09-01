"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  ErrorNote,
  EmptyState,
  Toggle,
  inputClass,
  labelClass,
  primaryBtn,
  ghostBtn,
  CardSkeleton,
} from "@/components/admin/AdminUI";

interface PlaybookBoardSummary {
  token: string;
  title: string;
  assetCount: number | null;
}

interface PlaybookAssetRow {
  token: string;
  title: string;
  mediaType: string | null;
  thumbnailUrl: string | null;
  isGroup: boolean;
  alreadyImported: boolean;
}

interface AppBoard {
  id: string;
  title: string;
  playbook_board_token: string | null;
}

export default function MediaImportPage() {
  const router = useRouter();

  const [pbBoards, setPbBoards] = useState<PlaybookBoardSummary[] | null>(null);
  const [pbBoardQuery, setPbBoardQuery] = useState("");
  const [selectedBoard, setSelectedBoard] = useState<PlaybookBoardSummary | null>(null);

  const [browseMode, setBrowseMode] = useState<"browse" | "search">("browse");
  const [aiQuery, setAiQuery] = useState("");
  const [assets, setAssets] = useState<PlaybookAssetRow[] | null>(null);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [appBoards, setAppBoards] = useState<AppBoard[]>([]);
  const [targetMode, setTargetMode] = useState<"new" | "existing">("new");
  const [existingBoardId, setExistingBoardId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newIsPublic, setNewIsPublic] = useState(true);

  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const fetchPbBoards = useCallback(async (query: string) => {
    const res = await fetch(`/api/admin/media/playbook/boards?query=${encodeURIComponent(query)}`);
    const data = await res.json();
    setPbBoards(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchPbBoards("");
    fetch("/api/admin/media/boards")
      .then((res) => res.json())
      .then((data) => setAppBoards(Array.isArray(data) ? data : []));
  }, [fetchPbBoards]);

  useEffect(() => {
    const t = setTimeout(() => fetchPbBoards(pbBoardQuery), 300);
    return () => clearTimeout(t);
  }, [pbBoardQuery, fetchPbBoards]);

  function selectBoard(board: PlaybookBoardSummary) {
    setSelectedBoard(board);
    setSelected(new Set());
    setBrowseMode("browse");
    setAiQuery("");
    setNewTitle(board.title);
    setNewSlug(board.title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
    const linked = appBoards.find((b) => b.playbook_board_token === board.token);
    if (linked) {
      setTargetMode("existing");
      setExistingBoardId(linked.id);
    } else {
      setTargetMode("new");
    }
    loadAssets(board.token, 1);
  }

  async function loadAssets(boardToken: string, page: number) {
    setAssetsLoading(true);
    try {
      const res = await fetch(`/api/admin/media/playbook/boards/${boardToken}/assets?page=${page}`);
      const data = await res.json();
      setAssets(data.assets ?? []);
    } catch {
      setAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  }

  async function runAiSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAssetsLoading(true);
    setBrowseMode("search");
    try {
      const res = await fetch(`/api/admin/media/playbook/search?q=${encodeURIComponent(aiQuery)}`);
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch {
      setAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  }

  function toggleAsset(token: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(token)) next.delete(token);
      else next.add(token);
      return next;
    });
  }

  async function handleImport() {
    if (!selectedBoard || selected.size === 0) return;
    setImporting(true);
    setError("");
    setResult(null);

    const body: Record<string, unknown> = {
      playbookBoardToken: selectedBoard.token,
      assetTokens: [...selected],
    };
    if (targetMode === "new") {
      if (!newTitle.trim() || !newSlug.trim()) {
        setError("Title and web address are required for a new board.");
        setImporting(false);
        return;
      }
      body.newBoard = { title: newTitle, slug: newSlug, is_public: newIsPublic };
    } else {
      if (!existingBoardId) {
        setError("Choose a board to import into.");
        setImporting(false);
        return;
      }
      body.existingBoardId = existingBoardId;
    }

    const res = await fetch("/api/admin/media/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Import failed");
      setImporting(false);
      return;
    }
    setResult(data);
    setSelected(new Set());
    if (selectedBoard) loadAssets(selectedBoard.token, 1);
    setImporting(false);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PageHeader
        title="Import from Playbook"
        subtitle="Bring hand-picked photos from an existing Playbook board into a /media board — nothing is imported wholesale, and imported photos go live immediately without moderation."
        back={{ href: "/admin/media/boards", label: "Boards" }}
      />

      <ErrorNote>{error}</ErrorNote>

      {result && (
        <p className="mb-6 rounded-xl bg-success/10 px-4 py-2.5 text-sm font-medium text-success">
          Imported {result.imported} photo{result.imported === 1 ? "" : "s"}
          {result.skipped > 0 ? ` (${result.skipped} already imported, skipped)` : ""}.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Playbook board picker */}
        <div>
          <label className={labelClass}>Playbook board</label>
          <input
            type="text"
            value={pbBoardQuery}
            onChange={(e) => setPbBoardQuery(e.target.value)}
            placeholder="Search boards…"
            className={`${inputClass} mb-3`}
          />
          {!pbBoards ? (
            <CardSkeleton count={4} />
          ) : (
            <div className="flex flex-col gap-1 rounded-2xl border border-black/5 bg-white p-1.5 dark:border-white/8 dark:bg-destiny-grey-800">
              {pbBoards.map((b) => (
                <button
                  key={b.token}
                  onClick={() => selectBoard(b)}
                  className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                    selectedBoard?.token === b.token
                      ? "bg-destiny-orange/10 font-bold text-destiny-orange"
                      : "text-destiny-grey hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                  }`}
                >
                  <div className="truncate">{b.title}</div>
                  <div className="text-xs text-destiny-grey/40 dark:text-white/40">
                    {b.assetCount ?? 0} photos
                  </div>
                </button>
              ))}
              {pbBoards.length === 0 && (
                <p className="px-3 py-2 text-sm text-destiny-grey/45 dark:text-white/45">No boards found.</p>
              )}
            </div>
          )}
        </div>

        {/* Asset picker + target */}
        <div>
          {!selectedBoard ? (
            <EmptyState icon="photo_library" title="Choose a Playbook board" hint="Pick one on the left to browse or search its photos." />
          ) : (
            <>
              <form onSubmit={runAiSearch} className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder={`Ask Playbook AI to find photos in "${selectedBoard.title}"… e.g. "worship team on stage"`}
                  className={inputClass}
                />
                <button type="submit" className={primaryBtn}>
                  <span className="material-symbols-rounded text-lg">auto_awesome</span>
                  Search
                </button>
                {browseMode === "search" && (
                  <button
                    type="button"
                    className={ghostBtn}
                    onClick={() => {
                      setBrowseMode("browse");
                      setAiQuery("");
                      loadAssets(selectedBoard.token, 1);
                    }}
                  >
                    Back to browsing
                  </button>
                )}
              </form>

              {assetsLoading ? (
                <CardSkeleton count={9} />
              ) : !assets || assets.length === 0 ? (
                <EmptyState icon="search_off" title="No photos found" />
              ) : (
                <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                  {assets.map((a) => (
                    <button
                      key={a.token}
                      type="button"
                      disabled={a.alreadyImported || a.isGroup}
                      onClick={() => toggleAsset(a.token)}
                      className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                        a.alreadyImported || a.isGroup
                          ? "cursor-not-allowed border-transparent opacity-40"
                          : selected.has(a.token)
                            ? "border-destiny-orange"
                            : "border-transparent hover:border-black/10"
                      }`}
                      title={
                        a.alreadyImported
                          ? "Already imported"
                          : a.isGroup
                            ? "A group of similar photos — open it in Playbook to select individual ones"
                            : a.title
                      }
                    >
                      {a.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-black/5 dark:bg-white/5">
                          <span className="material-symbols-rounded text-2xl text-destiny-grey/30">image</span>
                        </div>
                      )}
                      {selected.has(a.token) && (
                        <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destiny-orange text-white">
                          <span className="material-symbols-rounded text-sm">check</span>
                        </span>
                      )}
                      {a.alreadyImported && (
                        <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] font-bold text-white">
                          Imported
                        </span>
                      )}
                      {a.isGroup && !a.alreadyImported && (
                        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-0.5 text-[10px] font-bold text-white">
                          <span className="material-symbols-rounded text-xs">burst_mode</span>
                          Group
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="rounded-2xl border border-black/5 bg-white p-5 dark:border-white/8 dark:bg-destiny-grey-800">
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-destiny-grey/50 dark:text-white/50">
                  Import {selected.size} photo{selected.size === 1 ? "" : "s"} into
                </h2>

                <div className="mb-4 flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={targetMode === "new"}
                      onChange={() => setTargetMode("new")}
                    />
                    A new board
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={targetMode === "existing"}
                      onChange={() => setTargetMode("existing")}
                    />
                    An existing board
                  </label>
                </div>

                {targetMode === "new" ? (
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Title"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={newSlug}
                      onChange={(e) =>
                        setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""))
                      }
                      placeholder="web-address"
                      className={inputClass}
                    />
                    <label className="flex items-center gap-2 whitespace-nowrap px-2 text-sm">
                      <Toggle checked={newIsPublic} onChange={setNewIsPublic} label="Public board" />
                      Public
                    </label>
                  </div>
                ) : (
                  <select
                    value={existingBoardId}
                    onChange={(e) => setExistingBoardId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Choose a board…</option>
                    {appBoards
                      .filter(
                        (b) => !b.playbook_board_token || b.playbook_board_token === selectedBoard.token,
                      )
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.title}
                        </option>
                      ))}
                  </select>
                )}

                <div className="mt-5 flex justify-end gap-3">
                  <button className={ghostBtn} onClick={() => router.push("/admin/media/boards")}>
                    Cancel
                  </button>
                  <button
                    className={primaryBtn}
                    disabled={selected.size === 0 || importing}
                    onClick={handleImport}
                  >
                    {importing ? "Importing…" : `Import ${selected.size || ""}`}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
