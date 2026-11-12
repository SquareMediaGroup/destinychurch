// Sermon notes: kept on this phone only, like drafts, per member (so each
// account on a shared phone has its own), and wiped on sign-out. Nothing is
// uploaded: backing them up to the account is a later decision (scope doc).
//
// A note is plain text: "# " starts a heading, "- " a bullet, and any Bible
// reference in it shows as a verse card under the note.

import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { activeMemberId } from "@/lib/accounts";

export interface SermonNote {
  id: string;
  title: string;
  body: string;
  /** The sermon it was started from, if any. */
  sermon: { videoId: string; title: string } | null;
  createdAt: string;
  updatedAt: string;
}

const key = (memberId: string) => `d1.notes.v1.${memberId}`;
const cache = new Map<string, SermonNote[]>();
const listeners = new Set<() => void>();
const notify = () => {
  for (const l of listeners) l();
};

async function load(memberId: string): Promise<SermonNote[]> {
  const hit = cache.get(memberId);
  if (hit) return hit;
  let notes: SermonNote[] = [];
  try {
    const raw = await AsyncStorage.getItem(key(memberId));
    if (raw) notes = JSON.parse(raw) as SermonNote[];
  } catch {
    notes = [];
  }
  cache.set(memberId, notes);
  return notes;
}

async function store(memberId: string, notes: SermonNote[]): Promise<void> {
  cache.set(memberId, notes);
  notify();
  try {
    await AsyncStorage.setItem(key(memberId), JSON.stringify(notes));
  } catch {
    // kept in memory until the app closes
  }
}

/** My notes, newest first. Undefined while loading. */
export function useNotes(): SermonNote[] | undefined {
  const memberId = activeMemberId();
  const [notes, setNotes] = useState<{ id: string | null; list: SermonNote[] } | undefined>(undefined);
  useEffect(() => {
    if (!memberId) return;
    let live = true;
    const sync = () => {
      const list = cache.get(memberId);
      if (live && list) setNotes({ id: memberId, list: [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
    };
    listeners.add(sync);
    void load(memberId).then(sync);
    return () => {
      live = false;
      listeners.delete(sync);
    };
  }, [memberId]);
  return notes && notes.id === memberId ? notes.list : undefined;
}

function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** A new note, titled with the sermon and today's date (or just the date). */
export async function createNote(sermon: SermonNote["sermon"] = null): Promise<SermonNote> {
  const memberId = activeMemberId();
  const now = new Date();
  const date = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
  const note: SermonNote = { id: newId(), title: sermon ? `${sermon.title} (${date})` : `Sermon notes, ${date}`, body: "", sermon, createdAt: now.toISOString(), updatedAt: now.toISOString() };
  if (memberId) await store(memberId, [note, ...(await load(memberId))]);
  return note;
}

export function getNote(id: string): SermonNote | null {
  const memberId = activeMemberId();
  return (memberId && cache.get(memberId)?.find((n) => n.id === id)) || null;
}

export async function saveNote(id: string, patch: Partial<Pick<SermonNote, "title" | "body">>): Promise<void> {
  const memberId = activeMemberId();
  if (!memberId) return;
  const notes = await load(memberId);
  await store(memberId, notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)));
}

/** Adds a reference on its own line at the end (the Verse screen's "Add"). */
export async function appendToNote(id: string, line: string): Promise<void> {
  const note = getNote(id);
  if (!note) return;
  const body = note.body.replace(/\s*$/, "");
  await saveNote(id, { body: `${body}${body ? "\n" : ""}${line}\n` });
}

export async function deleteNote(id: string): Promise<void> {
  const memberId = activeMemberId();
  if (!memberId) return;
  await store(memberId, (await load(memberId)).filter((n) => n.id !== id));
}

/** Signing an account out: its notes go with it. */
export function forgetNotes(memberId: string): void {
  cache.delete(memberId);
  void AsyncStorage.removeItem(key(memberId)).catch(() => undefined);
  notify();
}

/** A note as one message, for sharing to a group. */
export function noteText(id: string): string {
  const n = getNote(id);
  if (!n) return "";
  return `${n.title}\n\n${n.body}`.trim();
}
