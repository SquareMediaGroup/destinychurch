"use client";

import { useState } from "react";
import AnimateIn from "@/components/AnimateIn";
import Button from "@/components/ui/Button";
import PhotoLightbox from "@/components/media/PhotoLightbox";
import UploadModal from "@/components/media/UploadModal";
import type { MediaBoard, MediaPhoto } from "@/lib/media.server";

export default function BoardDetail({
  board,
  photos,
}: {
  board: MediaBoard;
  photos: MediaPhoto[];
}) {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <section className="bg-white pt-20 pb-8">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <AnimateIn>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                  Photos
                </p>
                <h1 className="text-3xl font-black text-destiny-grey md:text-4xl">
                  {board.title}
                </h1>
                {board.description && (
                  <p className="mt-2 max-w-2xl text-sm text-destiny-grey/60">
                    {board.description}
                  </p>
                )}
              </div>
              {board.allowUploads && (
                <Button variant="primary" onClick={() => setUploadOpen(true)}>
                  <span className="material-symbols-rounded text-lg">add_a_photo</span>
                  Add a photo
                </Button>
              )}
            </div>
          </AnimateIn>
        </div>
      </section>

      <section className="bg-white pb-20">
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <AnimateIn>
            <PhotoLightbox photos={photos} />
          </AnimateIn>
        </div>
      </section>

      {uploadOpen && (
        <UploadModal boardToken={board.shareToken} onClose={() => setUploadOpen(false)} />
      )}
    </>
  );
}
