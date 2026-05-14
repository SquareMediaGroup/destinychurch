import { describe, it, expect } from "vitest";
import { describeStep, buildPhases } from "@/lib/github-actions";

// Minimal WorkflowStep factory
function step(
  name: string,
  status: "queued" | "in_progress" | "completed",
  conclusion: "success" | "failure" | "skipped" | null = null,
  number = 1
) {
  return { name, status, conclusion, number, started_at: null, completed_at: null };
}

describe("describeStep", () => {
  it("maps 'Set up job' to Booting", () => {
    expect(describeStep("Set up job").name).toBe("Booting");
  });

  it("is case-insensitive", () => {
    expect(describeStep("SET UP JOB").name).toBe("Booting");
  });

  it("maps 'Checkout' step correctly", () => {
    const result = describeStep("Checkout code");
    expect(result.name).toBe("Checkout");
    expect(result.description).toContain("latest code");
  });

  it("maps npm ci to Dependencies", () => {
    expect(describeStep("Run npm ci").name).toBe("Dependencies");
  });

  it("maps 'Generate page code' to Drafting", () => {
    expect(describeStep("Generate page code").name).toBe("Drafting");
  });

  it("returns the raw name when no match is found", () => {
    expect(describeStep("Some unknown step").name).toBe("Some unknown step");
    expect(describeStep("Some unknown step").description).toBe("Some unknown step");
  });
});

describe("buildPhases — no steps", () => {
  it("returns a single queued phase when steps is undefined", () => {
    const { phases, currentIndex } = buildPhases(undefined);
    expect(phases).toHaveLength(1);
    expect(phases[0].status).toBe("running");
    expect(currentIndex).toBe(0);
  });

  it("returns a single queued phase when steps is empty", () => {
    const { phases } = buildPhases([]);
    expect(phases).toHaveLength(1);
  });
});

describe("buildPhases — with steps", () => {
  it("filters out 'set up runner' and 'post job cleanup' steps", () => {
    const steps = [
      step("Set up runner", "completed", "success", 1),
      step("Checkout", "completed", "success", 2),
      step("Post job cleanup", "completed", "success", 3),
    ];
    const { phases } = buildPhases(steps);
    expect(phases).toHaveLength(1);
    expect(phases[0].name).toBe("Checkout");
  });

  it("marks an in_progress step as running and sets currentIndex", () => {
    const steps = [
      step("Checkout", "completed", "success", 1),
      step("Run npm ci", "in_progress", null, 2),
      step("Generate page code", "queued", null, 3),
    ];
    const { phases, currentIndex } = buildPhases(steps);
    expect(phases[1].status).toBe("running");
    expect(currentIndex).toBe(1);
  });

  it("marks a failed step as failed", () => {
    const steps = [step("Checkout", "completed", "failure", 1)];
    const { phases } = buildPhases(steps);
    expect(phases[0].status).toBe("failed");
  });

  it("marks a successfully completed step as completed", () => {
    const steps = [step("Checkout", "completed", "success", 1)];
    const { phases } = buildPhases(steps);
    expect(phases[0].status).toBe("completed");
  });

  it("pending steps have status pending", () => {
    const steps = [step("Checkout", "queued", null, 1)];
    const { phases } = buildPhases(steps);
    expect(phases[0].status).toBe("pending");
  });

  it("falls back to last completed step as currentIndex when no step is in_progress", () => {
    const steps = [
      step("Checkout", "completed", "success", 1),
      step("Run npm ci", "completed", "success", 2),
    ];
    const { currentIndex } = buildPhases(steps);
    expect(currentIndex).toBe(1);
  });

  it("uses friendly names from describeStep", () => {
    const steps = [step("Set up job", "completed", "success", 1)];
    const { phases } = buildPhases(steps);
    expect(phases[0].name).toBe("Booting");
  });
});
