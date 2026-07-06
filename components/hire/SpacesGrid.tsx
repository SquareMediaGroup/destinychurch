"use client";

import Image from "next/image";
import { useState } from "react";
import AnimateIn from "@/components/AnimateIn";

type Photo = { src: string; caption: string };

type Space = {
  name: string;
  icon: string;
  capacity: string;
  capacityNote?: string;
  description: string;
  features: string[];
  photos: Photo[];
  overflow?: boolean;
};

const spaces: Space[] = [
  {
    name: "Main Auditorium",
    icon: "stadium",
    capacity: "Up to 350",
    capacityNote: "Up to 400 with meeting room overflow",
    description:
      "Our main hall seats up to 350 and comes with concert-ready AVL — a full PA system, large projection screens and a full stage lighting rig on a raised platform. Ideal for conferences, concerts, performances and large events.",
    features: ["Concert-ready AVL", "Full PA system", "Projection screens", "Stage lighting rig", "Raised platform", "Accessible seating"],
    photos: [
      { src: "/img/photos/hire/main-auditorium-1.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/main-auditorium-2.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/main-auditorium-3.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/main-auditorium-4.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/main-auditorium-5.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/main-auditorium-6.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/main-auditorium-7.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/main-auditorium-8.webp", caption: "Limitless Oxygen 2025" },
    ],
  },
  {
    name: "Meeting Room 1",
    icon: "meeting_room",
    capacity: "Up to 25",
    description:
      "A bright, flexible meeting room equipped with a ceiling-mounted projector and speaker system. Suitable for training sessions, workshops or presentations, and doubles as overflow seating for the Main Auditorium during larger events.",
    features: ["Projector & speaker", "Whiteboard", "Air conditioning", "Wi-Fi", "Auditorium overflow space"],
    overflow: true,
    photos: [
      { src: "/img/photos/hire/meeting-room-1-1.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/meeting-room-1-2.webp", caption: "Limitless Oxygen 2025" },
    ],
  },
  {
    name: "Meeting Room 2",
    icon: "meeting_room",
    capacity: "Up to 25",
    description:
      "A versatile meeting room equipped with a wall-mounted TV, well suited to smaller groups, interviews or discussion-based sessions. Also available as overflow seating for the Main Auditorium during larger events.",
    features: ["Wall-mounted TV", "Whiteboard", "Air conditioning", "Wi-Fi", "Auditorium overflow space"],
    overflow: true,
    photos: [
      { src: "/img/photos/hire/meeting-room-2-1.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/meeting-room-2-2.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/meeting-room-2-3.webp", caption: "Limitless Oxygen 2025" },
      { src: "/img/photos/hire/meeting-room-2-4.webp", caption: "Limitless Oxygen 2025" },
    ],
  },
  {
    name: "Meeting Room 3",
    icon: "meeting_room",
    capacity: "Up to 20",
    description:
      "A flexible meeting room equipped with a projector and speaker system, suitable for training sessions, interviews or workshops.",
    features: ["Projector & speaker", "Whiteboard", "Air conditioning", "Wi-Fi"],
    photos: [],
  },
  {
    name: "Meeting Room 4",
    icon: "meeting_room",
    capacity: "Up to 20",
    description:
      "A flexible meeting room equipped with a wall-mounted TV, suitable for training sessions, interviews or workshops.",
    features: ["Wall-mounted TV", "Whiteboard", "Air conditioning", "Wi-Fi"],
    photos: [],
  },
  {
    name: "Meeting Room 5",
    icon: "meeting_room",
    capacity: "Up to 15",
    description:
      "A smaller meeting room equipped with a wall-mounted TV, ideal for interviews, small group sessions or one-to-ones.",
    features: ["Wall-mounted TV", "Whiteboard", "Air conditioning", "Wi-Fi"],
    photos: [],
  },
  {
    name: "Meeting Room 6",
    icon: "meeting_room",
    capacity: "Up to 15",
    description:
      "A smaller meeting room equipped with a projector and speaker system, ideal for interviews, small group sessions or one-to-ones.",
    features: ["Projector & speaker", "Whiteboard", "Air conditioning", "Wi-Fi"],
    photos: [],
  },
  {
    name: "Café / Foyer Area",
    icon: "local_cafe",
    capacity: "Up to 80",
    description:
      "Our café and foyer space is perfect for networking events, receptions, exhibitions or informal gatherings. A fully equipped kitchen is available on request.",
    features: ["Kitchen on request", "Café furniture", "Natural light", "Ground floor access", "Ideal for receptions"],
    photos: [],
  },
];

export default function SpacesGrid() {
  const [active, setActive] = useState<Space | null>(null);

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {spaces.map((space, i) => (
          <AnimateIn key={space.name} delay={(i % 3) * 80} className="h-full">
            <button
              onClick={() => setActive(space)}
              className="group flex h-full w-full flex-col rounded-3xl bg-[#f5f7fa] p-7 text-left transition duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10 transition group-hover:bg-destiny-orange/20">
                <span className="material-symbols-rounded text-2xl text-destiny-orange">{space.icon}</span>
              </div>
              <h3 className="mb-1 font-black text-destiny-grey">{space.name}</h3>
              <p className="mb-3 text-xs font-bold text-destiny-orange">{space.capacity}</p>
              <p className="flex-1 text-sm leading-relaxed text-destiny-grey/60">{space.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-destiny-orange">
                See details
                <span className="material-symbols-rounded text-sm">arrow_forward</span>
              </span>
            </button>
          </AnimateIn>
        ))}
      </div>

      {active && <SpaceModal space={active} onClose={() => setActive(null)} />}
    </>
  );
}

function PhotoSlideshow({ photos }: { photos: Photo[] }) {
  const [index, setIndex] = useState(0);
  if (photos.length === 0) return null;
  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-black">
      <Image
        key={photos[index].src}
        src={photos[index].src}
        alt={photos[index].caption}
        fill
        className="object-cover transition-opacity duration-300"
        sizes="(max-width: 640px) 100vw, 672px"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
        <p className="text-xs font-bold text-white/90">{photos[index].caption}</p>
      </div>
      {photos.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Previous photo"
          >
            <span className="material-symbols-rounded text-[1.1rem]">chevron_left</span>
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Next photo"
          >
            <span className="material-symbols-rounded text-[1.1rem]">chevron_right</span>
          </button>
          <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: i === index ? "1.5rem" : "0.375rem",
                  background: i === index ? "#F58021" : "rgba(255,255,255,0.5)",
                }}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SpaceModal({ space, onClose }: { space: Space; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={space.name}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="animate-slide-up relative z-10 flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white sm:rounded-3xl sm:shadow-2xl">
        <div className="h-1 w-full shrink-0 bg-destiny-orange" />

        <div className="overflow-y-auto">
          <div className="flex items-start gap-4 px-6 pt-6 pb-4">
            <div className="flex-1">
              <h2 className="text-xl font-black text-destiny-grey">{space.name}</h2>
              <p className="mt-1 text-sm font-bold text-destiny-orange">
                {space.capacity}
                {space.capacityNote && (
                  <span className="ml-1 font-normal text-destiny-grey/50">— {space.capacityNote}</span>
                )}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/5 text-destiny-grey/50 transition hover:bg-black/10"
              aria-label="Close"
            >
              <span className="material-symbols-rounded text-[1.2rem]">close</span>
            </button>
          </div>

          {space.photos.length > 0 ? (
            <div className="pb-5">
              <PhotoSlideshow photos={space.photos} />
            </div>
          ) : (
            <div className="mx-6 mb-5 flex items-center gap-2 rounded-2xl bg-[#f5f7fa] px-4 py-3">
              <span className="material-symbols-rounded text-lg text-destiny-grey/30">photo_camera</span>
              <p className="text-xs text-destiny-grey/50">Photos of this space are coming soon.</p>
            </div>
          )}

          <div className="px-6 pb-4">
            <p className="text-sm leading-relaxed text-destiny-grey/70">{space.description}</p>
          </div>

          {space.features.length > 0 && (
            <div className="mx-6 mb-6 rounded-2xl bg-[#f5f7fa] p-4">
              <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-widest text-destiny-grey/40">Equipment &amp; Features</p>
              <ul className="space-y-2">
                {space.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.82rem] text-destiny-grey/70">
                    <span className="material-symbols-rounded mt-0.5 shrink-0 text-[0.95rem] text-destiny-orange">check_circle</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="px-6 pb-8">
            <a
              href="#enquiry"
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-full bg-destiny-orange py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              Enquire About This Space
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
