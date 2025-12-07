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

export async function updateSermonTitle(formData: FormData) {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) {
    throw new Error("Unauthorized");
  }

  const id = String(formData.get("id") || "");
  const title = String(formData.get("title") || "").trim();

  if (!id || !title) {
    throw new Error("ID and title are required");
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sermons")
    .update({ title })
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
