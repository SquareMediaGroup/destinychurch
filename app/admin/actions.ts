"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminUser, createAdminUser, deleteAdminUser } from "@/lib/adminUsers";
import { syncSermons } from "@/lib/sync";

const ADMIN_COOKIE = "destiny-admin";
const ADMIN_ROLE_COOKIE = "destiny-admin-role";

const adminUser = process.env.ADMIN_USER || "admin";
const adminPassword = process.env.ADMIN_PASSWORD || "Romans12:1";

export async function login(formData: FormData) {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  let role: "super" | "admin" | null = null;
  if (username === adminUser && password === adminPassword) {
    role = "super";
  } else {
    const verified = await verifyAdminUser(username, password);
    role = verified ? "admin" : null;
  }

  if (!role) throw new Error("Invalid credentials");

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
  cookieStore.set(ADMIN_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  cookieStore.delete(ADMIN_ROLE_COOKIE);
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

export async function updateSermonMeta(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();
  const videoInput = String(formData.get("video") || "").trim();
  const podcastInput = String(formData.get("podcast") || "").trim();
  const youtubeId = youtubeIdFromLink(videoInput);

  if (!id || !title) {
    throw new Error("ID and title are required");
  }

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = { title };
  if (youtubeId) {
    update.youtube_video_id = youtubeId;
    update.thumbnail_url = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  } else {
    update.youtube_video_id = null;
    update.thumbnail_url = null;
  }

  if (podcastInput) {
    update.podcast_guid = podcastInput;
    update.podcast_audio_url = podcastInput;
  } else {
    update.podcast_guid = null;
    update.podcast_audio_url = null;
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

  try {
    const result = await syncSermons();
    revalidatePath("/sermons");
    revalidatePath("/admin");
    redirect(
      `/admin?sync=ok&saved=${result.saved}&podcast=${result.podcastCount}&youtube=${result.youtubeCount}`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed unexpectedly";
    console.error("Sync all failed", error);
    redirect(
      `/admin?syncError=${encodeURIComponent(message)}`,
    );
  }
}

export async function runSyncLimited(limit = 5) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await syncSermons({ limit });
    revalidatePath("/sermons");
    revalidatePath("/admin");
    redirect(
      `/admin?sync=ok&saved=${result.saved}&podcast=${result.podcastCount}&youtube=${result.youtubeCount}`,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed unexpectedly";
    console.error("Sync limited failed", error);
    redirect(
      `/admin?syncError=${encodeURIComponent(message)}`,
    );
  }
}

export async function deleteSermon(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  const id = String(formData.get("id") || "");
  if (!id) {
    throw new Error("Missing id");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("sermons").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
}

export async function clearSermons() {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("sermons").delete().neq("id", "");
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
}

export async function addAdminUser(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  const role = cookieStore.get(ADMIN_ROLE_COOKIE)?.value;
  if (!authed || role !== "super") throw new Error("Only super admin can add users");

  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  if (!username || !password) throw new Error("Username and password required");
  await createAdminUser(username, password);
  revalidatePath("/admin");
}

export async function deleteAdminUserAction(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  const role = cookieStore.get(ADMIN_ROLE_COOKIE)?.value;
  if (!authed || role !== "super") throw new Error("Only super admin can delete users");

  const username = String(formData.get("username") || "").trim();
  if (!username || username === adminUser) throw new Error("Cannot delete that user");
  await deleteAdminUser(username);
  revalidatePath("/admin");
}
