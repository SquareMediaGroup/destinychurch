// Destiny One — turning what the app sends for a poll into the message content
// the database stores (before the wording is sealed). Shared by sending a poll
// now (the messages route) and sending a scheduled one (scheduledSends.server.ts).

import { randomUUID } from "node:crypto";
import type { D1MessageContent, D1PollDraft } from "@destiny/shared";

export function buildPollContent(draft: Pick<D1PollDraft, "question" | "options" | "allowMultiple">): D1MessageContent {
  return {
    kind: "poll",
    poll: {
      id: randomUUID(),
      question: draft.question.trim(),
      options: draft.options.map((label, i) => ({ id: `o${i + 1}`, label: label.trim() })),
      allowMultiple: draft.allowMultiple,
      totalVoters: 0,
      votes: [],
      myOptionIds: [],
    },
  };
}
