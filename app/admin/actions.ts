"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase";
import { verifyAdminUser, createAdminUser, deleteAdminUser } from "@/lib/adminUsers";
import { syncSermons } from "@/lib/sync";
import { saveSermon } from "@/lib/db";
import { createPlaylistRecord } from "@/lib/playlists";

type MinimalSermonRow = {
  id: string;
  youtube_video_id?: string | null;
  podcast_guid?: string | null;
};

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

const parseDate = (value: string) => {
  if (!value) return null;
  const asDate = new Date(value);
  return Number.isNaN(asDate.getTime()) ? null : asDate.toISOString().slice(0, 10);
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
  const thumbnail = String(formData.get("thumbnail") || "").trim();
  const date = parseDate(String(formData.get("date") || ""));
  const youtubePubDate = parseDate(String(formData.get("youtubePubDate") || ""));
  const podcastPubDate = parseDate(String(formData.get("podcastPubDate") || ""));
  const summary = String(formData.get("summary") || "");
  const transcript = String(formData.get("transcript") || "");
  const isGuest = String(formData.get("isGuest") || "") === "on";
  const guestName = String(formData.get("guestName") || "").trim();
  const youtubeId = youtubeIdFromLink(videoInput);

  if (!id || !title) {
    throw new Error("ID and title are required");
  }

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {
    title,
    date,
    youtube_pub_date: youtubePubDate,
    podcast_pub_date: podcastPubDate,
    summary: summary || null,
    transcript: transcript || null,
    guest_speaker: isGuest ? guestName || "YES" : null,
  };
  if (youtubeId) {
    update.youtube_video_id = youtubeId;
    update.thumbnail_url = thumbnail || `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`;
  } else {
    update.youtube_video_id = null;
    update.thumbnail_url = thumbnail || null;
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

export async function createSermon(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  const title = String(formData.get("title") || "").trim();
  const date = parseDate(String(formData.get("date") || ""));
  const videoInput = String(formData.get("video") || "").trim();
  const podcastInput = String(formData.get("podcast") || "").trim();
  const youtubeId = youtubeIdFromLink(videoInput);
  const youtubePubDate = parseDate(String(formData.get("youtubePubDate") || ""));
  const podcastPubDate = parseDate(String(formData.get("podcastPubDate") || ""));
  const thumbnail = String(formData.get("thumbnail") || "").trim();
  const summary = String(formData.get("summary") || "");
  const transcript = String(formData.get("transcript") || "");
  const isGuest = String(formData.get("isGuest") || "") === "on";
  const guestName = String(formData.get("guestName") || "").trim();

  if (!title) throw new Error("Title is required");
  if (!date) throw new Error("Date is required");

  const id = `manual:${crypto.randomUUID()}`;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sermons")
    .insert({
      id,
      title,
      date,
      youtube_video_id: youtubeId || null,
      youtube_pub_date: youtubePubDate,
      podcast_guid: podcastInput || null,
      podcast_audio_url: podcastInput || null,
      podcast_pub_date: podcastPubDate,
      thumbnail_url: thumbnail || (youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : null),
      summary: summary || null,
      transcript: transcript || null,
      guest_speaker: isGuest ? guestName || "YES" : null,
    })
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);

  revalidatePath("/sermons");
  revalidatePath("/admin");
  return data?.id;
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

export async function updateSiteBanner(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  const message = String(formData.get("message") || "").trim();
  const description = String(formData.get("description") || "").trim();

  const supabase = getSupabaseAdmin();

  if (!message) {
    const { error } = await supabase.from("site_banner").delete().neq("id", "");
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("site_banner").insert({
      message,
      description: description || null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  revalidatePath("/announcement");
  revalidatePath("/admin");
}

export async function runSyncLatest() {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await syncSermons({ limit: 1, latestOnly: true, dryRun: true });
    const latest = result.sermons[0];
    if (!latest) {
      redirect(`/admin?syncError=${encodeURIComponent("No sermon data returned.")}`);
    }

    const supabase = getSupabaseAdmin();
    const latestDate = new Date(latest.date);
    const dayStart = new Date(latestDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(latestDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: existing, error } = await supabase
      .from("sermons")
      .select("id")
      .gte("date", dayStart.toISOString())
      .lt("date", dayEnd.toISOString())
      .limit(1);

    if (error) {
      throw new Error(error.message);
    }

    if (existing && existing.length > 0) {
      const dateLabel = latestDate.toISOString().slice(0, 10);
      redirect(
        `/admin?syncNotice=already&date=${encodeURIComponent(dateLabel)}`,
      );
    }

    await saveSermon(latest);
    revalidatePath("/sermons");
    revalidatePath("/admin");
    redirect(`/admin?sync=ok&saved=1&podcast=${result.podcastCount}&youtube=${result.youtubeCount}`);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Sync failed unexpectedly";
    console.error("Sync latest failed", error);
    redirect(`/admin?syncError=${encodeURIComponent(message)}`);
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

export async function resolveReport(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) throw new Error("Unauthorized");

  const id = String(formData.get("id") || "");
  const acknowledged = String(formData.get("ack") || "") === "on";
  if (!id || !acknowledged) throw new Error("Please confirm you read the report");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("ai_reports").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function createPlaylistAction(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  const title = String(formData.get("title") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const sermonOrderRaw = String(formData.get("sermonOrder") || "");

  const sermonTokens = sermonOrderRaw
    .split(/\r?\n/)
    .flatMap((line) => line.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  if (!title) throw new Error("Title is required");
  if (!sermonTokens.length) {
    throw new Error("Add at least one sermon ID, YouTube ID, or podcast GUID.");
  }

  const supabase = getSupabaseAdmin();
  const { data: sermons, error } = await supabase
    .from("sermons")
    .select("id, youtube_video_id, podcast_guid")
    .order("date", { ascending: false });

  if (error) throw new Error(error.message);

  const byId = new Map<string, string>();
  const byYoutube = new Map<string, string>();
  const byPodcast = new Map<string, string>();
  (sermons || []).forEach((row: MinimalSermonRow) => {
    if (row.id) byId.set(row.id, row.id);
    if (row.youtube_video_id) byYoutube.set(row.youtube_video_id, row.id);
    if (row.podcast_guid) byPodcast.set(row.podcast_guid, row.id);
  });

  const resolved: string[] = [];
  const missing: string[] = [];
  sermonTokens.forEach((token) => {
    const match = byId.get(token) || byYoutube.get(token) || byPodcast.get(token);
    if (match && !resolved.includes(match)) {
      resolved.push(match);
    } else if (!match) {
      missing.push(token);
    }
  });

  if (!resolved.length) {
    throw new Error("No matching sermons found for that list.");
  }
  if (missing.length) {
    const preview = missing.slice(0, 3).join(", ");
    throw new Error(`Could not find sermons for: ${preview}`);
  }

  const { slug } = await createPlaylistRecord({
    title,
    description,
    slug: slugInput,
    sermonIds: resolved,
    isPublic: true,
  });

  revalidatePath("/playlists");
  revalidatePath(`/playlists/${encodeURIComponent(slug)}`);
  revalidatePath("/sermons/series");
  revalidatePath(`/sermons/series/${encodeURIComponent(slug)}`);
  revalidatePath("/admin");
}
