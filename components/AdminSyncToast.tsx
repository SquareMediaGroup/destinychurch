"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "./ToastProvider";

export default function AdminSyncToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const notice = searchParams.get("syncNotice");
    if (notice === "already") {
      const date = searchParams.get("date");
      toast.info(
        date
          ? `Sermon for ${date} is already imported.`
          : "Sermon already imported.",
        "Sync skipped",
      );
      router.replace("/admin");
    }
  }, [searchParams, router, toast]);

  return null;
}
