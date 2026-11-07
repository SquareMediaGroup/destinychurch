"use client";

// Runs admin onboarding: Welcome, Videos, Sandbox, Finish.
//
// Videos and Finish are modals (OnboardingDialog). The Sandbox is not: it is
// the real admin with demo mode switched on, and a bar across the top
// (SandboxBar) saying so. Any stage can be reached from any other, at any time -
// from the dialog's stepper, the Get Started launcher, the Help page or the
// command palette (`?onboarding=<stage>` on any admin URL).
//
// Demo mode (lib/demoMode.ts) is on for exactly as long as the sandbox is open,
// and off for everything else, including Finish: the thing a person is asked to
// believe is that the sandbox is the only place saves are fake.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { clearDemoCookie, enterDemoMode, exitDemoMode } from "@/lib/demoMode";
import { stageFromParam, type OnboardingStage } from "@/lib/adminOnboarding";
import { useOnboarding } from "@/lib/onboardingProgress";
import { rolesForPreview, useAdminSession, setRolePreview, type PreviewRole } from "@/lib/useAdminSession";
import dynamic from "next/dynamic";
import OnboardingChecklist from "./OnboardingChecklist";
import RolePreviewBar from "./RolePreviewBar";
import SandboxBar from "./SandboxBar";
const OnboardingDialog = dynamic(() => import("./OnboardingDialog"));

/** `?onboarding=videos` (or welcome, sandbox, finish) on any admin URL opens that stage. */
const STAGE_PARAM = "onboarding";
/** The old tour's parameter. Bookmarks and the published videos still point at it. */
const LEGACY_PARAM = "tour";

interface FlowContext {
  /** The stage on screen, or null when onboarding is out of the way. */
  stage: OnboardingStage | null;
  /** Which of videos / sandbox / finish this person has done. */
  completed: ReadonlySet<string>;
  /** Open a stage. Sandbox also takes you to the dashboard and switches saves off. */
  go: (stage: OnboardingStage) => void;
  /** A super admin: look at one role's onboarding, with the admin narrowed to it. */
  startRole: (role: PreviewRole, stage?: OnboardingStage) => void;
  /** Put onboarding away without finishing. */
  close: () => void;
}

const Ctx = createContext<FlowContext | null>(null);

export function useOnboardingFlow(): FlowContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useOnboardingFlow must be used inside OnboardingProvider");
  return ctx;
}

export default function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { roles, actualRoles, previewRole, loaded: sessionLoaded } = useAdminSession();
  const progress = useOnboarding();

  const [chosen, setChosen] = useState<OnboardingStage | null>(null);
  const ready = sessionLoaded && progress.loaded;

  // First visit: the welcome opens by itself. Previewing someone else's admin is
  // not a first visit, and neither is anything once the gate has been answered.
  const autoWelcome = ready && !previewRole && !progress.gateSeen && chosen === null;
  const stage: OnboardingStage | null = chosen ?? (autoWelcome ? "welcome" : null);
  const sandboxing = stage === "sandbox";

  /* ── Demo mode is on for exactly as long as the sandbox is ───────────────── */
  useEffect(() => {
    if (sandboxing) {
      enterDemoMode();
      return;
    }
    // Also runs on first mount: a tab closed mid-sandbox would otherwise leave
    // the cookie behind and middleware would refuse real saves for two hours.
    exitDemoMode();
    clearDemoCookie();
  }, [sandboxing]);

  useEffect(() => {
    const onUnload = () => clearDemoCookie();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  // The sandbox's phantom rows live in memory and are gone the moment demo mode
  // ends, but a page already showing them would keep showing them. Leaving the
  // sandbox lands on the dashboard so nothing real is edited on top of one.
  const wasSandboxing = useRef(false);
  useEffect(() => {
    if (wasSandboxing.current && !sandboxing && pathname !== "/admin") router.push("/admin");
    wasSandboxing.current = sandboxing;
  }, [sandboxing, pathname, router]);

  const go = useCallback(
    (next: OnboardingStage) => {
      // Progress belongs to the person, not to a preview of somebody else.
      const record = !previewRole;
      if (record) progress.setGateSeen();
      // Leaving a stage ticks it off, so moving on is the same as finishing it.
      if (record && stage === "videos" && (next === "sandbox" || next === "finish")) progress.complete("videos");
      if (record && stage === "sandbox" && next !== "sandbox") progress.complete("sandbox");
      if (next === "sandbox" && pathname !== "/admin") router.push("/admin");
      setChosen(next);
    },
    [previewRole, progress, stage, pathname, router],
  );

  const close = useCallback(() => {
    if (!previewRole) progress.setGateSeen();
    setChosen(null);
  }, [previewRole, progress]);

  const finish = useCallback(() => {
    if (!previewRole) {
      progress.complete("finish");
      progress.dismiss();
    }
    setChosen(null);
  }, [previewRole, progress]);

  const startRole = useCallback(
    (role: PreviewRole, next: OnboardingStage = "videos") => {
      // Narrow the interface to the role as well, so the sandbox's sidebar is the
      // one that role actually gets. The preview bar stays up afterwards so they
      // can keep looking around, and says how to leave.
      setRolePreview(role);
      if (next === "sandbox" && pathname !== "/admin") router.push("/admin");
      setChosen(next);
    },
    [pathname, router],
  );

  const value = useMemo<FlowContext>(
    () => ({ stage, completed: progress.completed, go, startRole, close }),
    [stage, progress.completed, go, startRole, close],
  );

  const showLauncher =
    ready && stage === null && progress.gateSeen && !progress.dismissed && !previewRole && !progress.completed.has("finish");

  return (
    <Ctx.Provider value={value}>
      {sandboxing ? (
        <SandboxBar previewRole={previewRole} onVideos={() => go("videos")} onFinish={() => go("finish")} />
      ) : (
        previewRole && actualRoles.super_admin && <RolePreviewBar role={previewRole} />
      )}
      {children}
      {/* Its own Suspense boundary: useSearchParams would otherwise opt every
          admin page out of prerendering. */}
      <Suspense fallback={null}>
        <StageParam ready={ready} onStage={go} />
      </Suspense>
      {stage && stage !== "sandbox" && (
        <OnboardingDialog
          stage={stage}
          roles={previewRole ? rolesForPreview(previewRole) : roles}
          previewing={previewRole !== null}
          onGo={go}
          onClose={close}
          onFinish={finish}
        />
      )}
      {showLauncher && <OnboardingChecklist />}
    </Ctx.Provider>
  );
}

/**
 * Opens a stage when `?onboarding=<stage>` lands on the URL (the command
 * palette's entries, the Help page), then strips the parameter so a refresh
 * doesn't open it again. The old `?tour=1` opens the sandbox, which is what the
 * old tour was for. A component of its own so the search-params read sits behind
 * a Suspense boundary.
 */
function StageParam({ ready, onStage }: { ready: boolean; onStage: (stage: OnboardingStage) => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const wanted = stageFromParam(params.get(STAGE_PARAM)) ?? (params.has(LEGACY_PARAM) ? "sandbox" : null);
  // onStage changes identity on most renders; only a fresh parameter should fire.
  const onStageRef = useRef(onStage);
  useEffect(() => {
    onStageRef.current = onStage;
  }, [onStage]);

  useEffect(() => {
    if (!ready || !wanted) return;
    const rest = new URLSearchParams(params.toString());
    rest.delete(STAGE_PARAM);
    rest.delete(LEGACY_PARAM);
    const query = rest.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    onStageRef.current(wanted);
  }, [ready, wanted, params, pathname, router]);

  return null;
}
