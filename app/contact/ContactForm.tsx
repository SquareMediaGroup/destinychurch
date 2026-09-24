"use client";

import { useRef, useState } from "react";
import { submitContactForm } from "./actions";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/Icon";
import { Field, SelectField, TextareaField } from "@/components/ui/Field";

const ACCESSIBILITY_OPTIONS = [
  { name: "accessibility_step_free", label: "Step-free access" },
  { name: "accessibility_bsl", label: "BSL (British Sign Language) interpretation" },
  { name: "accessibility_hearing_loop", label: "Hearing loop" },
  { name: "accessibility_large_print", label: "Large print materials" },
] as const;

export default function ContactForm() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [subject, setSubject] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

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
      // Focus the confirmation. Replacing a form with a success panel is
      // silent otherwise: a screen reader user is left on a submit button that
      // no longer exists and has no idea whether anything happened.
      requestAnimationFrame(() => successRef.current?.focus());
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Something went wrong.");
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  if (status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-panel bg-green-50 px-4 py-4 text-center focus:outline-none"
      >
        <Icon
          name="check_circle"
          size="2xl"
          className="mb-1 block text-green-600"
        />
        <p className="font-bold text-green-700">Message sent!</p>
        <p className="text-sm text-green-700">
          Thanks for getting in touch — we&apos;ll be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <Field
        label="Full Name"
        name="name"
        type="text"
        required
        autoComplete="name"
        placeholder="Your name"
      />

      <Field
        label="Email Address"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
      />

      <SelectField
        label="Subject"
        name="subject"
        required
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
      >
        <option value="" disabled>
          Select a subject
        </option>
        <option value="Safeguarding">Safeguarding</option>
        <option value="Privacy">Privacy</option>
        <option value="Complaints">Complaints</option>
        <option value="Enquiries">Enquiries</option>
        <option value="Accessibility">Accessibility</option>
        <option value="Other">Other</option>
      </SelectField>

      {subject === "Accessibility" && (
        <fieldset className="rounded-panel border border-hairline bg-surface-muted px-4 py-4">
          <legend className="px-1 text-sm font-bold text-destiny-grey">
            What do you need for your visit?
          </legend>
          <p className="mb-3 text-xs text-subtle">
            Let us know so we can make sure it&apos;s ready for you.
          </p>
          <div className="space-y-2.5">
            {ACCESSIBILITY_OPTIONS.map((option) => (
              <label
                key={option.name}
                className="flex items-center gap-2.5 text-sm text-destiny-grey"
              >
                <input
                  type="checkbox"
                  name={option.name}
                  className="h-4 w-4 shrink-0 rounded border-hairline text-destiny-orange focus:outline-none focus:ring-2 focus:ring-destiny-orange/30"
                />
                {option.label}
              </label>
            ))}
          </div>

          <div className="mt-4">
            <label
              htmlFor="accessibility_other"
              className="mb-1.5 block text-sm font-bold text-destiny-grey"
            >
              Anything else we should know?
            </label>
            <textarea
              id="accessibility_other"
              name="accessibility_other"
              rows={3}
              placeholder="Optional — tell us about any other access needs"
              className="w-full rounded-xl border border-hairline bg-white px-4 py-3 text-sm text-destiny-grey transition placeholder:text-subtle focus:border-destiny-orange focus:outline-none focus:ring-2 focus:ring-destiny-orange/30"
            />
          </div>
        </fieldset>
      )}

      {subject === "Safeguarding" && (
        // role="alert" so choosing "Safeguarding" actually announces the 999
        // guidance rather than silently revealing it below the fold.
        <div
          role="alert"
          className="rounded-panel border border-red-200 bg-red-50 px-4 py-4"
        >
          <p className="mb-1 font-bold text-red-700">
            If someone is in immediate danger
          </p>
          <p className="text-sm text-red-700">
            Please call <strong>999</strong> immediately. Do not wait for a
            response to this form.
          </p>
          <p className="mt-2 text-sm text-red-700">
            For non-emergency safeguarding concerns, you can also contact the
            NSPCC helpline on <strong>0808 800 5000</strong> (free, 24/7).
          </p>
        </div>
      )}

      <TextareaField
        label="Message"
        name="message"
        required
        rows={6}
        placeholder="How can we help you?"
      />

      {status === "error" && (
        <div
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="flex items-start gap-2 rounded-panel bg-red-50 px-4 py-3 text-sm text-red-700 focus:outline-none"
        >
          <Icon name="error" size="sm" className="mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <Button type="submit" fullWidth loading={status === "loading"}>
        {status === "loading" ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}
