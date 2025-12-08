import "server-only";

import crypto from "crypto";
import { getSupabaseAdmin, tryGetSupabaseAdmin } from "./supabase";

const PASSWORD_SALT = process.env.ADMIN_PASSWORD_SALT || "destiny-admin-salt";

export function hashPassword(password: string) {
  return crypto.createHash("sha256").update(`${PASSWORD_SALT}:${password}`).digest("hex");
}

export async function verifyAdminUser(username: string, password: string) {
  const supabase = tryGetSupabaseAdmin();
  if (!supabase) return false;
  const { data } = await supabase
    .from("admin_users")
    .select("password_hash")
    .eq("username", username)
    .maybeSingle();
  if (!data?.password_hash) return false;
  return data.password_hash === hashPassword(password);
}

export async function createAdminUser(username: string, password: string) {
  const supabase = getSupabaseAdmin();
  const password_hash = hashPassword(password);
  const { error } = await supabase
    .from("admin_users")
    .upsert({ username, password_hash })
    .select("username")
    .maybeSingle();
  if (error) throw error;
}

export async function deleteAdminUser(username: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("admin_users").delete().eq("username", username);
  if (error) throw error;
}

export async function listAdminUsers(): Promise<{ username: string; createdAt?: string }[]> {
  const supabase = tryGetSupabaseAdmin();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("admin_users")
    .select("username, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (
    data?.map((row: { username: string; created_at: string | null }) => ({
      username: row.username,
      createdAt: row.created_at ?? undefined,
    })) ?? []
  );
}
