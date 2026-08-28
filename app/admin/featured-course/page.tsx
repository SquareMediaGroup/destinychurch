"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { COURSE_ORDER, COURSES, type CourseId } from "@/lib/courses";

export default function FeaturedCoursePage() {
  const [current, setCurrent] = useState<CourseId>("bible_course");
  const [selected, setSelected] = useState<CourseId>("bible_course");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/featured-course");
        const data = await res.json();
        const id = data?.course_id as CourseId;
        if (id && COURSES[id]) {
          setCurrent(id);
          setSelected(id);
        }
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/featured-course", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: selected }),
      });
      if (res.ok) {
        setCurrent(selected);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const d = await res.json();
        setError(d.error ?? "Something went wrong");
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const dirty = selected !== current;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-destiny-grey">Featured course</h1>
        <p className="mt-1 text-sm text-destiny-grey/50">
          Choose which course headlines the What&apos;s On page. The featured
          course shows as the wide banner; the other three stay in the grid
          below, so all four are always visible.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <span className="material-symbols-rounded animate-spin text-3xl text-destiny-grey/20">
            progress_activity
          </span>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {COURSE_ORDER.map((id) => {
              const course = COURSES[id];
              const isSelected = selected === id;
              const isCurrent = current === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-white p-4 text-left transition dark:bg-destiny-grey-800 ${
                    isSelected
                      ? "border-destiny-orange ring-2 ring-destiny-orange/30"
                      : "border-black/8 hover:border-black/20 dark:border-white/8 dark:hover:border-white/20"
                  }`}
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#f5f7fa]">
                    <Image
                      src={course.card.image}
                      alt={course.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-black text-destiny-grey">
                        {course.name}
                      </p>
                      {isCurrent && (
                        <span className="shrink-0 rounded-full bg-destiny-orange/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destiny-orange">
                          Featured
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-destiny-grey/50">
                      {course.card.cta.href}
                    </p>
                  </div>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      isSelected
                        ? "border-destiny-orange bg-destiny-orange text-white"
                        : "border-black/15 text-transparent"
                    }`}
                  >
                    <span className="material-symbols-rounded text-base leading-none">
                      check
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving}
              className="rounded-xl bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-bold text-destiny-green">
                <span className="material-symbols-rounded text-base leading-none">
                  check_circle
                </span>
                Saved
              </span>
            )}
            {dirty && !saving && !saved && (
              <span className="text-xs text-destiny-grey/40">
                Unsaved changes
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
