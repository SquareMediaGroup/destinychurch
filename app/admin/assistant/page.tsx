import type { Metadata } from "next";
import AssistantChat from "@/components/admin/assistant/AssistantChat";

export const metadata: Metadata = { title: "DestinyAI" };

export default function AdminAssistantPage() {
  return <AssistantChat />;
}
