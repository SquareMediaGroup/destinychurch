"use client";

// Runs the admin onboarding: decides whether anything shows at all, drives the
// tour from step to step, and owns the demo-mode switch.
//
// The state machine per step is: navigate if we're not on the right page →
// wait for the step's data-tour anchor to exist → position the card → wait for
// Next, or for a click on the anchor. Anchors are polled rather than observed
// because the page they live on is usually still fetching when we arrive;
// giving up after a couple of seconds and showing a centred card is better than
// a tour that stalls on a slow list.
//
// Demo mode is entered for the *whole* run, not just the sandbox steps. A tour
// where only some buttons are safe is a tour nobody trusts.

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  checklistFor,
  checklistForRole,
  finaleStep,
  progressFor,
  sectionOfStep,
  stepsOf,
  type TourSection,
  type TourStep,
} from "@/lib/adminOnboarding";
import { clearDemoCookie, enterDemoMode, exitDemoMode } from "@/lib/demoMode";
import { useOnboarding } from "@/lib/onboardingProgress";
import { useAdminSession, type PreviewRole } from "@/lib/useAdminSession";
import OnboardingChecklist from "./OnboardingChecklist";
import RolePreviewBar from "./RolePreviewBar";
import TourSpotlight from "./TourSpotlight";
import WelcomeGate from "./WelcomeGate";

/** How long to wait for a step's anchor before showing the card unanchored. */
const ANCHOR_TIMEOUT_MS = 2500;

interface TourContext {
  /** The checklist this person is owed, in order. */
  sections: TourSection[];
  completed: ReadonlySet<string>;
  running: boolean;
  /** Start the whole checklist, or resume at the first unfinished section. */
  start: (sectionId?: string) => void;
  /** Preview one role's tour — super admins only. */
  startRole: (role: PreviewRole, sectionId?: string) => void;
  stop: () => void;
}

const Ctx = createContext<TourContext | null>(null);

export function useOnboardingTour(): TourContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboardingTour must be used inside OnboardingProvider");
  return ctx;
}

export default function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { roles, actualRoles, previewRole, loaded: sessionLoaded } = useAdminSession();
  const progress = useOnboarding();

  // What the person is actually taught. A super admin previewing Store Admin
  // gets the store tour; a super admin who isn't previewing gets nothing.
  const sections = useMemo(
    () => (previewRole ? checklistForRole(previewRole) : checklistFor(roles)),
    [previewRole, roles],
  );

  const [run, setRun] = useState<{ steps: TourStep[]; index: number } | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searching, setSearching] = useState(false);
  // advance() is handed to click listeners on page elements, which capture it
  // once; the ref is how it reads the run it's actually in rather than the one
  // that existed when the listener was attached.
  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const step = run ? run.steps[run.index] : null;

  /* ── Demo mode is on for exactly as long as a tour is ────────────────────── */
  useEffect(() => {
    if (run) {
      enterDemoMode();
      return;
    }
    // Also runs on first mount: a tab closed mid-tour would otherwise leave the
    // cookie behind and middleware would refuse real saves for two hours.
    exitDemoMode();
    clearDemoCookie();
  }, [run]);

  useEffect(() => {
    const onUnload = () => clearDemoCookie();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  /* ── Navigate to the step's page ─────────────────────────────────────────── */
  useEffect(() => {
    if (!step || step.stay) return;
    const onRoute = pathname === step.route || pathname.startsWith(`${step.route}/`);
    if (!onRoute) router.push(step.route);
  }, [step, pathname, router]);

  /* ── Find the anchor, then keep it in view ───────────────────────────────── */
  useEffect(() => {
    const selector = step?.anchor ? `[data-tour="${step.anchor}"]` : null;
    const started = performance.now();
    let frame = 0;
    let first = true;

    // All of this runs inside the animation frame rather than in the effect
    // body: the page we've just navigated to is usually still fetching its list
    // when we arrive, so there is nothing to measure synchronously anyway.
    const look = () => {
      if (first) {
        first = false;
        setAnchorEl(null);
        setSearching(selector !== null);
      }
      if (!selector) return;

      // The admin renders desktop and mobile copies of the header search and
      // the nav; only one of them has a size at any width, so take the first
      // match that is actually on screen rather than the first in the DOM.
      const found = Array.from(document.querySelectorAll<HTMLElement>(selector)).find(
        (el) => el.getBoundingClientRect().width > 0,
      );
      if (found) {
        setAnchorEl(found);
        setSearching(false);
        found.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
      if (performance.now() - started > ANCHOR_TIMEOUT_MS) {
        // The page never produced it — show the card centred rather than stall.
        setSearching(false);
        return;
      }
      frame = requestAnimationFrame(look);
    };

    frame = requestAnimationFrame(look);
    return () => cancelAnimationFrame(frame);
  }, [step, pathname]);

  const advance = useCallback(() => {
    const active = runRef.current;
    if (!active) return;
    const current = active.steps[active.index];
    const next = active.steps[active.index + 1];

    // Tick the section off as we leave its last step.
    if (current) {
      const section = sectionOfStep(sections, current.id);
      const isLastOfSection = section
        ? section.steps[section.steps.length - 1].id === current.id
        : false;
      // Progress belongs to the person, not to a preview of somebody else.
      if (section && isLastOfSection && !previewRole) progress.completeSection(section.id);
    }

    if (!next) {
      setRun(null);
      return;
    }
    setRun({ ...active, index: active.index + 1 });
  }, [sections, progress, previewRole]);

  const back = useCallback(() => {
    setRun((active) =>
      active && active.index > 0 ? { ...active, index: active.index - 1 } : active,
    );
  }, []);

  /* ── Type the demo value in for them ─────────────────────────────────────── */
  useEffect(() => {
    if (!anchorEl || !step?.prefill) return;
    const field =
      anchorEl instanceof HTMLInputElement || anchorEl instanceof HTMLTextAreaElement
        ? anchorEl
        : anchorEl.querySelector<HTMLInputElement | HTMLTextAreaElement>("input, textarea");
    if (!field || field.value) return;

    // React tracks the last value it set on the node, so assigning .value
    // directly is swallowed on the next render. Going through the prototype
    // setter and firing a real input event is what makes React's onChange run.
    const proto =
      field instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(field, step.prefill);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.classList.add("tour-prefilled");
    field.focus();
    const timer = window.setTimeout(() => field.classList.remove("tour-prefilled"), 1400);
    return () => window.clearTimeout(timer);
  }, [anchorEl, step]);

  /* ── Steps that advance when you press the thing ─────────────────────────── */
  useEffect(() => {
    if (!anchorEl || !step?.advanceOnClick) return;
    const onClick = () => window.setTimeout(advance, 260);
    anchorEl.addEventListener("click", onClick);
    return () => anchorEl.removeEventListener("click", onClick);
  }, [anchorEl, step, advance]);

  const buildRun = useCallback(
    (list: TourSection[], label: string, sectionId?: string) => {
      const steps = [...stepsOf(list), finaleStep(label)];
      const from = sectionId
        ? steps.findIndex((s) => sectionOfStep(list, s.id)?.id === sectionId)
        : 0;
      return { steps, index: from === -1 ? 0 : from };
    },
    [],
  );

  const start = useCallback(
    (sectionId?: string) => {
      if (!sections.length) return;
      progress.setGateSeen();
      setRun(buildRun(sections, previewRole ?? "admin", sectionId));
    },
    [sections, buildRun, progress, previewRole],
  );

  const startRole = useCallback(
    (role: PreviewRole, sectionId?: string) => {
      const list = checklistForRole(role);
      setRun(buildRun(list, role, sectionId));
    },
    [buildRun],
  );

  const stop = useCallback(() => setRun(null), []);

  const value = useMemo<TourContext>(
    () => ({ sections, completed: progress.completed, running: run !== null, start, startRole, stop }),
    [sections, progress.completed, run, start, startRole, stop],
  );

  const { done, total } = progressFor(sections, progress.completed);

  // Nothing shows until we know who this is, and nothing shows for someone with
  // no tour to run (a super admin who isn't previewing).
  const ready = sessionLoaded && progress.loaded;
  const eligible = ready && sections.length > 0;
  const showGate = eligible && !previewRole && !progress.gateSeen && !run;
  const showChecklist = eligible && !run && progress.gateSeen && !progress.dismissed && done < total;

  return (
    <Ctx.Provider value={value}>
      {previewRole && actualRoles.super_admin && <RolePreviewBar role={previewRole} />}
      {children}
      {showGate && <WelcomeGate sections={sections} roles={roles} onStart={start} onSkip={progress.dismiss} />}
      {showChecklist && <OnboardingChecklist />}
      {run && step && (
        <TourSpotlight
          step={step}
          anchor={anchorEl}
          searching={searching}
          index={run.index}
          total={run.steps.length}
          onNext={advance}
          onBack={back}
          onExit={stop}
        />
      )}
    </Ctx.Provider>
  );
}
