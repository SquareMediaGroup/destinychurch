"use client";

import { useId } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import Icon from "@/components/ui/Icon";

/**
 * The two display preferences, split out so the statement around them can stay
 * a server component.
 *
 * The toggles used to be built from a `sr-only peer` checkbox and a styled
 * `<div>` carrying `peer-focus:outline-none` — which stripped the focus ring
 * from the only visible part of the control and put nothing back. The two
 * controls on the accessibility page were invisible to keyboard focus.
 *
 * Rebuilt here as a `switch`-role button. That drops the hidden-checkbox trick
 * entirely: focus lands on the thing you can see, `aria-checked` carries the
 * state, and the label is a real `<label>`-free association via
 * `aria-labelledby` pointing at the heading the switch belongs to.
 */

function Toggle({
  checked,
  onChange,
  labelId,
  descriptionId,
  activeColor,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  labelId: string;
  descriptionId: string;
  /** Tailwind background class used when on. */
  activeColor: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-14 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? activeColor : "bg-destiny-grey/25"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${
            checked ? "left-8" : "left-1"
          }`}
        />
      </button>
      {/* aria-hidden: the switch already announces on/off, so this would be a
          duplicate reading of the same state. */}
      <span
        aria-hidden="true"
        className="w-16 text-sm font-medium text-destiny-grey"
      >
        {checked ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}

function Preference({
  icon,
  iconClass,
  title,
  description,
  checked,
  onChange,
  activeColor,
}: {
  icon: string;
  iconClass: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  activeColor: string;
}) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <section className="rounded-shell bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <h3
            id={labelId}
            className="mb-2 flex items-center gap-2 text-xl font-bold text-destiny-grey"
          >
            <Icon name={icon} size="lg" className={iconClass} />
            {title}
          </h3>
          <p id={descriptionId} className="max-w-lg text-sm text-muted">
            {description}
          </p>
        </div>

        <Toggle
          checked={checked}
          onChange={onChange}
          labelId={labelId}
          descriptionId={descriptionId}
          activeColor={activeColor}
        />
      </div>
    </section>
  );
}

export default function AccessibilityPreferences() {
  const { glassFX, setGlassFX, reducedMotion, setReducedMotion } =
    useAccessibility();

  return (
    <div className="space-y-6">
      <Preference
        icon="layers"
        iconClass="text-destiny-orange"
        title="Glass effects"
        description="Translucent, blurred backgrounds on menus and banners. Turning this off can improve readability and performance on older devices."
        checked={glassFX}
        onChange={setGlassFX}
        activeColor="bg-destiny-orange"
      />

      <Preference
        icon="animation"
        iconClass="text-destiny-blue"
        title="Reduce animations"
        description="Turns off interface animations and transitions. Helpful if you find movement distracting or experience motion sickness. If your device is already set to reduce motion, this starts switched on."
        checked={reducedMotion}
        onChange={setReducedMotion}
        activeColor="bg-destiny-blue"
      />
    </div>
  );
}
