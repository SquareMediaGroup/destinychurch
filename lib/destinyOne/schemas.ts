// Destiny One — request body schemas for /api/app/v1/one/*.
//
// Length limits match the CHECK constraints in the migration, so a request the
// API accepts is one the database will too (short of a rule violation, which
// the database reports in its own words).

import { z } from "zod";
import { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES, MAX_FEEDBACK_LENGTH, MAX_MESSAGE_LENGTH, MAX_POLL_OPTIONS, MAX_POLL_OPTION_LENGTH, MAX_POLL_QUESTION_LENGTH, MIN_POLL_OPTIONS } from "@destiny/shared";

const uuid = z.string().uuid("That id isn't valid.").transform((s) => s.toLowerCase());
const name = z.string().trim().min(1, "A name is required.").max(80, "Names can be up to 80 characters.");
const optionalText = (max: number) => z.string().trim().max(max).optional().nullable();

export const consentsSchema = z.object({
  consents: z
    .array(
      z.object({
        document: z.enum(["privacy", "terms", "chat_review_notice"]),
        version: z.string().trim().min(1).max(40),
      }),
    )
    .min(1)
    .max(10),
});

export const updateNameSchema = z.object({
  firstName: name,
  lastName: name,
});

export const accessRequestSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name.").max(120),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth should look like 2008-05-17.")
    .optional(),
  note: z.string().trim().max(500).optional(),
});

export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE", { errorMap: () => ({ message: 'Send { "confirm": "DELETE" } to delete your account.' }) }),
});

export const emailChangeSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email("That doesn't look like an email address."),
});

export const emailChangeConfirmSchema = z.object({
  ticket: z.string().min(1).max(1000),
  code: z.string().trim().regex(/^\d{6}$/, "The code is 6 digits."),
});

export const pushTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/, "That isn't an Expo push token."),
  platform: z.enum(["ios", "android"]),
});

export const pushTokenDeleteSchema = z.object({ token: z.string().trim().min(10).max(300) });

export const createCommunitySchema = z.object({
  name,
  description: optionalText(500),
});

export const membersSchema = z.object({
  memberIds: z.array(uuid).min(1, "Choose at least one person.").max(200),
  role: z.enum(["admin", "member"]).default("member"),
});

/** Omit memberId to remove yourself (leave). */
export const removeMemberSchema = z.object({ memberId: uuid.optional() });

export const createGroupSchema = z.object({
  name,
  department: optionalText(80),
  description: optionalText(500),
  memberIds: z.array(uuid).min(2, "A group needs at least 3 people, including you.").max(500),
});

export const updateGroupSchema = z
  .object({
    name: name.optional(),
    department: optionalText(80),
    description: optionalText(500),
    archived: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const pollDraftSchema = z.object({
  question: z.string().trim().min(1, "Add a question.").max(MAX_POLL_QUESTION_LENGTH),
  options: z
    .array(z.string().trim().min(1).max(MAX_POLL_OPTION_LENGTH))
    .min(MIN_POLL_OPTIONS, `Add at least ${MIN_POLL_OPTIONS} options.`)
    .max(MAX_POLL_OPTIONS, `Polls can have up to ${MAX_POLL_OPTIONS} options.`),
  allowMultiple: z.boolean(),
});

export const eventRefSchema = z.object({
  seriesKey: z.string().trim().min(1).max(80),
  slug: z.string().trim().min(1).max(200),
});

export const sendMessageSchema = z
  .object({
    body: z.string().max(MAX_MESSAGE_LENGTH, `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`).optional(),
    replyTo: z.number().int().positive().optional(),
    attachmentId: uuid.optional(),
    poll: pollDraftSchema.optional(),
    event: eventRefSchema.optional(),
  })
  .refine(
    (v) => Boolean(v.body?.trim()) || Boolean(v.attachmentId) || Boolean(v.poll) || Boolean(v.event),
    "A message can't be empty.",
  );

export const voteSchema = z.object({
  optionIds: z.array(z.string().trim().min(1).max(40)).max(20),
});

export const readSchema = z.object({ messageId: z.number().int().positive() });

export const muteSchema = z.object({
  until: z.string().datetime({ offset: true }).nullable(),
});

export const reportSchema = z.object({
  reason: z.string().trim().min(1, "Please say what's wrong.").max(1000),
});

export const reactionSchema = z.object({
  // Reactions are user content (like message text), capped short so they stay
  // a reaction rather than a second message channel.
  emoji: z.string().trim().min(1).max(16),
});

export const uploadSchema = z.object({
  mimeType: z.enum(ATTACHMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_ATTACHMENT_BYTES, "Files can be up to 20 MB."),
});

export const exchangeSchema = z.object({
  code: z.string().min(20).max(4000),
  verifier: z.string().min(43).max(128),
});

// ── Admin (safeguarding) ──

const dob = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dates should look like 2008-05-17.");
const leaderRoles = z.array(z.enum(["admin", "cg_leader", "senior_leader"])).max(3);

/** Staff's decision on someone's age. See adultOnForDecision. */
export const ageDecisionSchema = z.object({
  adult: z.boolean(),
  dateOfBirth: dob.optional().nullable(),
});

export const adminApproveSchema = ageDecisionSchema.extend({
  displayName: z.string().trim().min(2).max(120).optional(),
  communityIds: z.array(uuid).max(20).default([]),
});

export const adminMemberSchema = z
  .object({
    displayName: z.string().trim().min(2, "Enter their full name.").max(120).optional(),
    roles: leaderRoles.optional(),
    status: z.enum(["active", "suspended"]).optional(),
    age: ageDecisionSchema.optional(),
    /** Link (or with null, unlink) a ChurchSuite record — for reference only. */
    churchsuite: z
      .object({ kind: z.enum(["contact", "child"]), id: z.number().int().positive() })
      .nullable()
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("That email address doesn't look right."),
  name: z.string().trim().min(2, "Enter their full name.").max(120),
  adult: z.boolean(),
  dateOfBirth: dob.optional().nullable(),
  roles: leaderRoles.default([]),
  communityIds: z.array(uuid).max(20).default([]),
});

export const invitesSchema = z.object({ invites: z.array(inviteSchema).min(1).max(100) });

/** A group leader inviting someone from the app. Staff confirm age on approval. */
export const leaderInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("That email address doesn't look right."),
  name: z.string().trim().min(2, "Enter their full name.").max(120),
  adult: z.boolean(),
  note: z.string().trim().max(300).optional(),
});

export const invitePatchSchema = z.object({ action: z.enum(["resend", "revoke"]) });

export const adminCommunitySchema = z.object({
  name,
  description: optionalText(500),
  adminIds: z.array(uuid).max(20).default([]),
});

export const adminCommunityPatchSchema = z
  .object({ name: name.optional(), description: optionalText(500), archived: z.boolean().optional() })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const adminRoleSchema = z.object({ memberId: uuid, role: z.enum(["admin", "member"]) });
export const adminRemoveSchema = z.object({ memberId: uuid });

export const adminGroupSchema = z.object({
  name,
  department: optionalText(80),
  description: optionalText(500),
  memberIds: z.array(uuid).max(500).default([]),
  adminIds: z.array(uuid).max(20).default([]),
});

export const adminSettingsSchema = z
  .object({
    allowAccessRequests: z.boolean().optional(),
    inviteExpiryDays: z.number().int().min(1).max(365).optional(),
    minBuildIos: z.number().int().min(1).max(1_000_000).optional(),
    minBuildAndroid: z.number().int().min(1).max(1_000_000).optional(),
    // Blank clears it (back to the default copy / app back on).
    forceUpdateMessage: z.string().trim().max(500).transform((v) => v || null).nullable().optional(),
    maintenanceMessage: z.string().trim().max(500).transform((v) => v || null).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const adminFreezeSchema = z.object({
  frozen: z.boolean(),
  reason: z.string().trim().max(500).default(""),
});

export const adminTakedownSchema = z.object({
  reason: z.string().trim().min(3, "Say why you are removing this message.").max(500),
});

export const adminSuspendSchema = z.object({
  suspended: z.boolean(),
  reason: z.string().trim().min(3, "Give a short reason for the record.").max(500),
});

export const adminResolveSchema = z.object({
  status: z.enum(["reviewing", "closed"]),
  resolution: z.string().trim().max(2000).optional(),
});

// Device details are optional and only ever filled in by the app; each is capped
// to its column so a bad value is dropped rather than refusing the feedback.
const detail = (max: number) => z.string().trim().max(max).optional().catch(undefined);

export const feedbackSchema = z.object({
  kind: z.enum(["problem", "idea"], { message: "Choose a problem or feedback." }),
  body: z.string().trim().min(1, "Please tell us a bit more.").max(MAX_FEEDBACK_LENGTH, `Please keep it under ${MAX_FEEDBACK_LENGTH} characters.`),
  appVersion: detail(40),
  platform: detail(20),
  osVersion: detail(40),
  device: detail(80),
  errorId: detail(64),
});

export const feedbackStatusSchema = z.object({
  status: z.enum(["new", "done"]),
});
