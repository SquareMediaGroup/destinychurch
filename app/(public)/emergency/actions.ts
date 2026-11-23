"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EMERGENCY_COOKIE } from "@/lib/emergencyAccess";

export async function emergencySignOut(): Promise<void> {
  (await cookies()).delete(EMERGENCY_COOKIE);
  redirect("/login");
}
