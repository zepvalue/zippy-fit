import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to generate code (simple implementation)
function generateCode(length: number = 4) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Unauthenticated");
        }

        // 1. Check if user is in a team
        const user = await ctx.db.get(userId);

        if (user?.team_id) {
            throw new Error("You are already in a team!");
        }

        // 2. Create Team
        const code = generateCode();
        const teamId = await ctx.db.insert("teams", {
            code,
            name: "Untitled Duo",
            hearts: 3,
            streak: 0,
            freezes_available: 0,
        });

        // 3. Link User to Team
        await ctx.db.patch(userId, { team_id: teamId });

        return { team_id: teamId, code, message: "Team Created" };
    },
});

export const join = mutation({
    args: { code: v.string() },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Unauthenticated");
        }

        // 1. Find team
        const team = await ctx.db
            .query("teams")
            .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
            .unique();

        if (!team) {
            throw new Error("Invalid invite code");
        }

        // 2. Join
        await ctx.db.patch(userId, { team_id: team._id });

        // 3. Cleanup old nudges
        await ctx.db.patch(team._id, {
            last_nudge_at: undefined,
            nudge_from_id: undefined
        });

        return { team_id: team._id, code: args.code, message: "Joined successfully" };
    }
});

export const spot = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user?.team_id) throw new Error("No team found");

        const today = new Date().toISOString().split("T")[0];

        await ctx.db.patch(user.team_id, {
            spot_requester_id: userId,
            spot_date: today,
        });

        return { message: "Spot requested" };
    }
});

export const nudge = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user?.team_id) throw new Error("No team found");

        await ctx.db.patch(user.team_id, {
            last_nudge_at: new Date().toISOString(),
            nudge_from_id: userId,
        });

        // In a real app, this would trigger a push notification via internal action
        return { message: "Nudge sent!" };
    }
});
