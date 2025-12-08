"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";

const ADMIN_COOKIE = "destiny-admin";

const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "Romans12:1";

export async function login(formData: FormData) {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  if (username !== adminUser || password !== adminPassword) {
    throw new Error("Invalid credentials");
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

const youtubeIdFromLink = (input: string) => {
  if (!input) return "";
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed) && !trimmed.includes("http")) {
    return trimmed;
  }
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v") || "";
      const parts = url.pathname.split("/");
      return parts.pop() || "";
    }
  } catch {
    return "";
  }
  return "";
};

export async function updateSermonTitle(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const videoInput = String(formData.get("video") || "").trim();
  const youtubeId = youtubeIdFromLink(videoInput);

  if (!id || !title) {
    throw new Error("ID and title are required");
  }

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = { title };
  if (youtubeId) {
    update.youtube_video_id = youtubeId;
    update.thumbnail_url = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  const { error } = await supabase
    .from("sermons")
    .update(update)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/sermons");
  revalidatePath(`/sermons/${encodeURIComponent(id)}`);
  revalidatePath("/admin");
}

export async function runSyncNow() {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.startsWith("http")
      ? process.env.NEXT_PUBLIC_SITE_URL
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

  try {
    const res = await fetch(`${origin}/api/sermon-sync`, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sync failed: ${res.status} ${text}`);
    }
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Sync failed unexpectedly",
    );
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
}
