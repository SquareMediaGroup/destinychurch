import { test, expect } from "@playwright/test";
import { DEPARTMENT_HEADS, LEAD_TEAM, TEAM, findTeamMembers, teamKnowledgeLines } from "../../lib/team";
import { CHURCH_FACTS } from "../../lib/siteKnowledge";

/**
 * lib/team.ts is the single source for the /about team grid, the Smart Search
 * knowledge prompt and the person cards. These pin lookup behaviour and that
 * every consumer really reads it rather than a hand-typed copy.
 */

test("ids are unique and every member has a name and role", () => {
  const ids = TEAM.map((m) => m.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const m of TEAM) {
    expect(m.name).toBeTruthy();
    expect(m.role).toBeTruthy();
  }
});

test("aliases resolve to the right person", () => {
  expect(findTeamMembers("who is NK?")[0].id).toBe("nk-ekanem");
  expect(findTeamMembers("nk")[0].id).toBe("nk-ekanem");
  expect(findTeamMembers("Cath Harris")[0].id).toBe("cath-harris");
  expect(findTeamMembers("tell me about Louise")[0].id).toBe("louise-sheekey");
});

test("role and ministry lookups work", () => {
  expect(findTeamMembers("who runs kids?")[0].id).toBe("funke-awojide");
  expect(findTeamMembers("kids pastor")[0].id).toBe("funke-awojide");
  expect(findTeamMembers("who leads prayer")[0].id).toBe("debo-awojide");
});

test("no match and empty queries return nothing, and results are capped", () => {
  expect(findTeamMembers("")).toEqual([]);
  expect(findTeamMembers("zzzz qqqq")).toEqual([]);
  expect(findTeamMembers("pastor", 2).length).toBeLessThanOrEqual(2);
});

test("the about grid groups match the data and the prompt quotes everyone", () => {
  expect(LEAD_TEAM.length).toBe(4);
  expect(DEPARTMENT_HEADS.length).toBe(4);
  const lines = teamKnowledgeLines();
  for (const m of TEAM) {
    expect(lines).toContain(m.name);
    expect(CHURCH_FACTS).toContain(m.name);
  }
});

test("bios are never invented: members without one render role only", () => {
  const faith = TEAM.find((m) => m.id === "faith-moradi")!;
  expect(faith.bio).toBeUndefined();
  expect(teamKnowledgeLines()).toContain("Faith Moradi — Associate Pastor (faith@destinytees.uk)");
});
