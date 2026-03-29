"use client";

import { useState, useRef } from "react";
import { submitContactForm } from "./actions";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const result = await submitContactForm(formData);

    if (result.success) {
      setStatus("success");
      formRef.current?.reset();
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Something went wrong.");
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-bold text-destiny-grey" htmlFor="name">
          Full Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Your name"
          className="w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-destiny-grey" htmlFor="email">
          Email Address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-destiny-grey" htmlFor="subject">
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          required
          className="w-full appearance-none rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
        >
          <option value="" disabled selected>Select a subject</option>
          <option value="Safeguarding">Safeguarding</option>
          <option value="Privacy">Privacy</option>
          <option value="Complaints">Complaints</option>
          <option value="Enquiries">Enquiries</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-bold text-destiny-grey" htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder="How can we help you?"
          className="w-full resize-none rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
        />
      </div>

      {status === "error" && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">{errorMsg}</p>
      )}

      {status === "success" ? (
        <div className="rounded-2xl bg-green-50 px-4 py-4 text-center">
          <span className="material-symbols-rounded mb-1 block text-3xl text-green-600">check_circle</span>
          <p className="font-bold text-green-700">Message sent!</p>
          <p className="text-sm text-green-600">Thanks for getting in touch — we&apos;ll be in touch soon.</p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-full bg-destiny-orange py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60"
        >
          {status === "loading" ? "Sending…" : "Send Message"}
        </button>
      )}
    </form>
  );
}
