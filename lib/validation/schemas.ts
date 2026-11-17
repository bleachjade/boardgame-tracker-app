import { z } from "zod";

/**
 * Search API validation
 */
export const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required").max(200, "Query too long"),
});

export const searchParamsSchema = z.object({
  q: z.string().optional(),
  ids: z.string().optional(),
});

/**
 * BGG API validation
 */
export const bggIdsSchema = z.object({
  ids: z.string().min(1, "Game IDs are required").max(2000, "Too many IDs"),
});

/**
 * Rule Bot API validation
 */
export const ruleBotRequestSchema = z.object({
  gameName: z.string().min(1, "Game name is required").max(200),
  question: z.string().min(1, "Question is required").max(2000),
  description: z.string().max(5000).optional(),
  mechanics: z.array(z.string()).max(20).optional(),
  minPlayers: z.string().optional(),
  maxPlayers: z.string().optional(),
  playTime: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(["user", "ai"]),
    text: z.string().max(2000),
  })).max(10).optional(),
});

/**
 * Game Nights API validation
 */
export const createGameNightSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  time: z.string().max(50).optional(),
  location: z.string().max(200).optional(),
  proposedGames: z.array(z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().optional(),
    maxPlayers: z.string().optional(),
  })).min(1, "At least one game must be proposed").max(10),
  invitedFriends: z.array(z.string()).optional(),
});

export const rsvpSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["yes", "no"]),
});

export const voteSchema = z.object({
  eventId: z.string().min(1),
  gameId: z.string().min(1),
});

/**
 * User Profile validation
 */
export const linkPartnerSchema = z.object({
  partnerEmail: z.string().email("Invalid email address"),
});

export const addFriendSchema = z.object({
  friendEmail: z.string().email("Invalid email address"),
});

export const inviteToGroupSchema = z.object({
  email: z.string().email("Invalid email address"),
});

/**
 * Game Management validation
 */
export const updateGameGroupsSchema = z.object({
  gameId: z.string().min(1),
  groupIds: z.array(z.string()),
});

export const bulkAssignSchema = z.object({
  gameIds: z.array(z.string()).min(1).max(50),
  groupIds: z.array(z.string()).min(1),
});

/**
 * Score Logging validation
 */
export const logScoreSchema = z.object({
  gameId: z.string().optional(),
  bggId: z.string().min(1),
  gameName: z.string().min(1),
  players: z.array(z.object({
    name: z.string().min(1).max(50),
    score: z.number(),
    rawExpression: z.string().optional(),
  })).min(1).max(10),
  isCoop: z.boolean(),
  playMode: z.enum(["score", "winner", "coop"]),
  coopResult: z.enum(["win", "loss"]).optional(),
  teamScore: z.number().optional(),
  memoryPhoto: z.string().optional(),
});

/**
 * Validation helper
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errorMessages = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
  return { success: false, error: errorMessages };
}