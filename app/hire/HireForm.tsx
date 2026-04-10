"use client";

import { useState, useRef } from "react";
import { submitHireEnquiry } from "./actions";

const SPACES = [
  "Main Auditorium",
  "Meeting Room 1",
  "Meeting Room 2",
  "Café / Foyer Area",
  "Entire Building",
  "Other / Not sure",
];

const EVENT_TYPES = [
  "Community Event",
  "Corporate Meeting",
  "Conference",
  "Birthday / Celebration",
  "Wedding Reception",
  "Funeral / Memorial",
  "Fitness / Classes",
  "Charity Event",
  "Other",
];

const inputClass =
  "w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20 placeholder:text-destiny-grey/40";
const labelClass = "mb-1.5 block text-sm font-bold text-destiny-grey";

export default function HireForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    const result = await submitHireEnquiry(new FormData(e.currentTarget));
    if (result.success) {
      setStatus("success");
      formRef.current?.reset();
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-3xl bg-green-50 px-6 py-10 text-center">
        <span className="material-symbols-rounded mb-3 block text-5xl text-green-500">check_circle</span>
        <p className="text-lg font-black text-green-700">Enquiry sent!</p>
        <p className="mt-1 text-sm text-green-600">
          Thanks — we&apos;ll be in touch within 2 working days to confirm availability and pricing.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

      {/* Contact details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">Full Name <span className="text-red-400">*</span></label>
          <input id="name" name="name" type="text" required placeholder="Your name" className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">Phone Number <span className="text-red-400">*</span></label>
          <input id="phone" name="phone" type="tel" required placeholder="07700 900000" className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="email">Email Address <span className="text-red-400">*</span></label>
        <input id="email" name="email" type="email" required placeholder="you@example.com" className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="organisation">Organisation / Group <span className="text-destiny-grey/40 font-normal">(optional)</span></label>
        <input id="organisation" name="organisation" type="text" placeholder="Company or group name" className={inputClass} />
      </div>

      <div className="h-px bg-black/5" />

      {/* Event details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="event_type">Event Type <span className="text-red-400">*</span></label>
          <select id="event_type" name="event_type" required defaultValue="" className={`${inputClass} appearance-none`}>
            <option value="" disabled>Select event type</option>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="space">Space Required <span className="text-red-400">*</span></label>
          <select id="space" name="space" required defaultValue="" className={`${inputClass} appearance-none`}>
            <option value="" disabled>Select a space</option>
            {SPACES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={labelClass} htmlFor="date">Date <span className="text-red-400">*</span></label>
          <input id="date" name="date" type="date" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="start_time">Start Time <span className="text-red-400">*</span></label>
          <input id="start_time" name="start_time" type="time" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass} htmlFor="end_time">End Time <span className="text-red-400">*</span></label>
          <input id="end_time" name="end_time" type="time" required className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="attendance">Expected Attendance <span className="text-red-400">*</span></label>
        <input id="attendance" name="attendance" type="number" required min="1" placeholder="e.g. 80" className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="requirements">AV / Special Requirements <span className="text-destiny-grey/40 font-normal">(optional)</span></label>
        <input id="requirements" name="requirements" type="text" placeholder="Projector, PA system, chairs layout, etc." className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="message">Anything else we should know? <span className="text-destiny-grey/40 font-normal">(optional)</span></label>
        <textarea id="message" name="message" rows={4} placeholder="Any other details about your event…" className={`${inputClass} resize-none`} />
      </div>

      {status === "error" && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-full bg-destiny-orange py-3.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60"
      >
        {status === "loading" ? "Sending enquiry…" : "Send Hire Enquiry"}
      </button>

      <p className="text-center text-xs text-destiny-grey/40">
        We aim to respond within 2 working days. For urgent enquiries call{" "}
        <a href="tel:+441642559797" className="underline hover:text-destiny-orange">01642 559797</a>.
      </p>
    </form>
  );
}
