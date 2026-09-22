"use client";

import { use } from "react";
import { Suspense } from "react";
import LinksEditor from "@/components/admin/links/LinksEditor";
import { PageLoading } from "@/components/admin/AdminUI";

export default function LinksPageEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // useSearchParams (the ?tab= deep link) needs a Suspense boundary.
  return (
    <Suspense fallback={<PageLoading label="Loading page" />}>
      <LinksEditor id={id} />
    </Suspense>
  );
}
