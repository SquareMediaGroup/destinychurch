"use client";

import { useState, useRef } from "react";
import { submitContactForm } from "./actions";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [subject, setSubject] = useState("");
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
      // The subject <select> is controlled, so the native form reset above
      // doesn't clear it on its own — without this it (and the safeguarding
      // banner it drives) would still show under the "Message sent!" panel.
      setSubject("");
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl bg-green-50 px-4 py-4 text-center">
        <span className="material-symbols-rounded mb-1 block text-3xl text-green-600">check_circle</span>
        <p className="font-bold text-green-700">Message sent!</p>
        <p className="text-sm text-green-600">Thanks for getting in touch — we&apos;ll be in touch soon.</p>
      </div>
    );
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
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full appearance-none rounded-2xl border border-black/10 bg-[#f5f7fa] px-4 py-3 text-sm text-destiny-grey outline-none transition focus:border-destiny-orange focus:ring-2 focus:ring-destiny-orange/20"
        >
          <option value="" disabled>Select a subject</option>
          <option value="Safeguarding">Safeguarding</option>
          <option value="Privacy">Privacy</option>
          <option value="Complaints">Complaints</option>
          <option value="Enquiries">Enquiries</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {subject === "Safeguarding" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
          <p className="mb-1 font-bold text-red-700">If someone is in immediate danger</p>
          <p className="text-sm text-red-600">
            Please call <strong>999</strong> immediately. Do not wait for a response to this form.
          </p>
          <p className="mt-2 text-sm text-red-600">
            For non-emergency safeguarding concerns, you can also contact the NSPCC helpline on{" "}
            <strong>0808 800 5000</strong> (free, 24/7).
          </p>
        </div>
      )}

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

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded-full bg-destiny-orange py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 disabled:opacity-60"
      >
        {status === "loading" ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
