"use client";

import { useMemo } from "react";
import { useToast } from "@/components/ToastProvider";
import { useContinueWatching } from "@/lib/continueWatching";
import { useCookieConsent } from "@/lib/cookieConsent";
import { useSettings } from "@/lib/settings";

const PROGRESS_KEY = "destiny-sermons-progress";

type ChoiceOption<T> = {
  value: T;
  label: string;
};

function ChoiceGroup<T extends string | number | boolean>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: ChoiceOption<T>[];
  onChange: (next: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? "border-destiny-orange bg-destiny-orange/10 text-destiny-orange"
                : "border-[var(--border-subtle)] text-[var(--foreground)] hover:border-destiny-orange"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
        {description ? (
          <p className="text-xs text-destiny-grey/80">{description}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSetting, resetSettings } = useSettings();
  const { consent, savePreferences } = useCookieConsent();
  const { refresh } = useContinueWatching();
  const toast = useToast();

  const analyticsEnabled = consent?.analytics ?? true;
  const mediaEnabled = consent?.media ?? true;

  const speedOptions = useMemo(
    () => [0.75, 1, 1.25, 1.5, 2],
    [],
  );

  const clearWatchProgress = () => {
    if (!window.confirm("Clear all sermon progress on this device?")) return;
    window.localStorage.removeItem(PROGRESS_KEY);
    refresh();
    toast.success("Watch progress cleared.");
  };

  const clearLocalData = () => {
    if (!window.confirm("Clear all local settings and progress on this device?")) return;
    window.localStorage.removeItem(PROGRESS_KEY);
    refresh();
    resetSettings();
    toast.success("Local data cleared.");
  };

  const handleContinueWatching = (next: boolean) => {
    updateSetting("continueWatching", next);
    if (!next) {
      window.localStorage.removeItem(PROGRESS_KEY);
      refresh();
      toast.info("Continue watching disabled.");
    }
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <p className="subheading text-sm text-destiny-orange">Settings</p>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Preferences</h1>
        <p className="max-w-2xl text-destiny-grey">
          Personalize playback, appearance, and privacy for this device.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Appearance</h2>
        <SettingsRow title="Text size">
          <ChoiceGroup
            ariaLabel="Text size"
            value={settings.textSize}
            onChange={(value) => updateSetting("textSize", value)}
            options={[
              { value: "normal", label: "Normal (default)" },
              { value: "large", label: "Large" },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          title="Reduce motion"
          description="Disables subtle animations for accessibility."
        >
          <ChoiceGroup
            ariaLabel="Reduce motion"
            value={settings.reduceMotion}
            onChange={(value) => updateSetting("reduceMotion", value)}
            options={[
              { value: true, label: "On" },
              { value: false, label: "Off" },
            ]}
          />
        </SettingsRow>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Playback</h2>
        <SettingsRow
          title="Video playback"
          description="Enable YouTube and Cloudflare embeds. If off, videos stay blocked."
        >
          <ChoiceGroup
            ariaLabel="Video playback"
            value={mediaEnabled}
            onChange={(value) => savePreferences({ media: value, analytics: analyticsEnabled })}
            options={[
              { value: true, label: "On (default)" },
              { value: false, label: "Off" },
            ]}
          />
        </SettingsRow>
        <SettingsRow title="Autoplay next sermon">
          <ChoiceGroup
            ariaLabel="Autoplay next sermon"
            value={settings.autoplayNext}
            onChange={(value) => updateSetting("autoplayNext", value)}
            options={[
              { value: true, label: "On" },
              { value: false, label: "Off" },
            ]}
          />
        </SettingsRow>
        <SettingsRow title="Default playback speed">
          <ChoiceGroup
            ariaLabel="Default playback speed"
            value={settings.playbackSpeed}
            onChange={(value) => updateSetting("playbackSpeed", value)}
            options={speedOptions.map((speed) => ({
              value: speed,
              label: speed === 1 ? "1x (default)" : `${speed}x`,
            }))}
          />
        </SettingsRow>
        <SettingsRow title="Resume playback">
          <ChoiceGroup
            ariaLabel="Resume playback"
            value={settings.resumePlayback}
            onChange={(value) => updateSetting("resumePlayback", value)}
            options={[
              { value: "resume", label: "Resume where I left off (default)" },
              { value: "restart", label: "Always start from beginning" },
            ]}
          />
        </SettingsRow>
        <SettingsRow title="Captions on by default">
          <ChoiceGroup
            ariaLabel="Captions on by default"
            value={settings.captionsEnabled}
            onChange={(value) => updateSetting("captionsEnabled", value)}
            options={[
              { value: true, label: "On" },
              { value: false, label: "Off" },
            ]}
          />
        </SettingsRow>
        <SettingsRow title="Caption size">
          <ChoiceGroup
            ariaLabel="Caption size"
            value={settings.captionSize}
            onChange={(value) => updateSetting("captionSize", value)}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium (default)" },
              { value: "large", label: "Large" },
            ]}
          />
        </SettingsRow>

        <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Continue watching</p>
              <p className="text-xs text-destiny-grey/80">
                Show progress rows and remember your spot on this device.
              </p>
            </div>
            <ChoiceGroup
              ariaLabel="Continue watching"
              value={settings.continueWatching}
              onChange={handleContinueWatching}
              options={[
                { value: true, label: "Enabled (default)" },
                { value: false, label: "Disabled" },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-destiny-grey/70">
              Watch progress is saved locally on this device only.
            </p>
            <button
              type="button"
              onClick={clearWatchProgress}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
            >
              Clear watch progress
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Privacy</h2>
        <SettingsRow
          title="Analytics"
          description="Allow anonymous usage analytics (default: On). Used to improve sermon discovery and playback."
        >
          <ChoiceGroup
            ariaLabel="Analytics"
            value={analyticsEnabled}
            onChange={(value) => savePreferences({ media: mediaEnabled, analytics: value })}
            options={[
              { value: true, label: "On" },
              { value: false, label: "Off" },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          title="Clear local data"
          description="Clears watch history, continue watching, and playback and appearance preferences."
        >
          <button
            type="button"
            onClick={clearLocalData}
            className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:border-destiny-orange hover:text-destiny-orange"
          >
            Clear local data
          </button>
        </SettingsRow>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 text-xs text-destiny-grey/80 shadow-sm">
          Clears: watch history, continue watching, playback and appearance preferences.
          Does not affect external platforms (YouTube, podcast apps).
        </div>
      </section>
    </div>
  );
}
