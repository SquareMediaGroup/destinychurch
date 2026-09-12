"use client";

import { useRouter } from "next/navigation";
import SermonAudioUploader from "@/components/admin/SermonAudioUploader";

export default function SermonsAdminClient() {
  const router = useRouter();
  return <SermonAudioUploader onUploaded={() => router.refresh()} />;
}
