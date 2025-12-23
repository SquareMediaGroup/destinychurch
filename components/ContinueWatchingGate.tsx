"use client";

import { useSearchParams } from "next/navigation";
import ContinueWatchingRow from "./ContinueWatchingRow";
import { Sermon } from "@/lib/types";

type ContinueWatchingGateProps = {
  sermons: Sermon[];
};

export default function ContinueWatchingGate({ sermons }: ContinueWatchingGateProps) {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim();

  if (query) return null;

  return <ContinueWatchingRow sermons={sermons} />;
}
