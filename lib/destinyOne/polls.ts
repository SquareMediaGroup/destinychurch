// Destiny One — what DestinyAI says when a poll closes (the pure half).
//
// "Poll closed: Saturday 10am won with 8 votes." Worked out from the poll's
// opened option labels and the tally d1_close_poll() returns. Kept free of env
// and `server-only` so it is unit-tested directly (tests/unit/destiny-one-polls.spec.ts).

import type { D1PollOption, D1PollTally } from "@destiny/shared";

const votes = (n: number) => `${n} ${n === 1 ? "vote" : "votes"}`;

/** "A", "A and B", "A, B and C". */
function list(labels: string[]): string {
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * The one-line result. Nobody voting, a clear winner and a tie each read
 * differently. `tally` counts votes per option; in a poll that allows several
 * choices a member's votes each count once, so "8 votes" is votes, not people.
 */
export function pollResultText(options: readonly D1PollOption[], tally: readonly D1PollTally[], totalVoters: number): string {
  const counts = new Map(tally.map((t) => [t.optionId, t.count]));
  const top = Math.max(0, ...options.map((o) => counts.get(o.id) ?? 0));
  if (top === 0) return "Poll closed: nobody voted.";

  const winners = options.filter((o) => (counts.get(o.id) ?? 0) === top).map((o) => o.label);
  if (winners.length === 1) {
    const people = totalVoters === 1 ? "1 person voted" : `${totalVoters} people voted`;
    return `Poll closed: ${winners[0]} won with ${votes(top)} (${people}).`;
  }
  return `Poll closed: ${list(winners)} tied with ${votes(top)} each.`;
}
