// Destiny One — request body schemas for /api/app/v1/one/*.
//
// Length limits match the CHECK constraints in the migration, so a request the
// API accepts is one the database will too (short of a rule violation, which
// the database reports in its own words).

import { z } from "zod";
import { ATTACHMENT_MIME_TYPES, MAX_ATTACHMENT_BYTES, MAX_MESSAGE_LENGTH } from "@destiny/shared";

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

export const sendMessageSchema = z
  .object({
    body: z.string().max(MAX_MESSAGE_LENGTH, `Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`).optional(),
    replyTo: z.number().int().positive().optional(),
    attachmentId: uuid.optional(),
  })
  .refine((v) => Boolean(v.body?.trim()) || Boolean(v.attachmentId), "A message can't be empty.");

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
const leaderRoles = z.array(z.enum(["group_leader", "senior_leadership"])).max(2);

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
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");

export const adminFreezeSchema = z.object({
  frozen: z.boolean(),
  reason: z.string().trim().max(500).default(""),
});

export const adminResolveSchema = z.object({
  status: z.enum(["reviewing", "closed"]),
  resolution: z.string().trim().max(2000).optional(),
});
