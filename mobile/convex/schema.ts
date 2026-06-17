import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
    // Users (Profiles)
    ...authTables,
    users: defineTable({
        name: v.optional(v.string()),
        image: v.optional(v.string()),
        email: v.optional(v.string()),
        emailVerificationTime: v.optional(v.number()),
        phone: v.optional(v.string()),
        phoneVerificationTime: v.optional(v.number()),
        isAnonymous: v.optional(v.boolean()),
        // Custom fields
        team_id: v.optional(v.id("teams")),
    }).index("email", ["email"])
        .index("by_team_id", ["team_id"]),

    // Teams
    teams: defineTable({
        code: v.string(),
        name: v.string(),
        hearts: v.number(),
        streak: v.number(),
        last_streak_at: v.optional(v.string()), // ISO date
        freezes_available: v.number(),

        // Repair / Critical State
        repair_deadline: v.optional(v.string()),

        // Boss Battle
        boss_hp: v.number(),
        boss_max_hp: v.number(),
        boss_name: v.string(),
        boss_image_index: v.number(),

        // Nudge & Spot
        last_nudge_at: v.optional(v.string()),
        nudge_from_id: v.optional(v.string()),
        spot_requester_id: v.optional(v.string()),
        spot_date: v.optional(v.string()),
    }).index("by_code", ["code"]),

    // Workouts
    workouts: defineTable({
        user_id: v.string(),
        team_id: v.id("teams"),
        is_spot_fill: v.optional(v.boolean()),
        duration_minutes: v.optional(v.number()),
        damage: v.optional(v.number()),
    }).index("by_team_id", ["team_id"])
        .index("by_user_id", ["user_id"]),

    // Challenges (Static content or daily)
    challenges: defineTable({
        text: v.string(),
        date: v.optional(v.string()), // YYYY-MM-DD or null for pool
    }).index("by_date", ["date"]),

    // User Facts (Grimoire unlocks)
    user_facts: defineTable({
        user_id: v.string(),
        fact_id: v.number(), // ID from the static list
    }).index("by_user", ["user_id", "fact_id"]),
});
